import { GameCreatedEvent } from '../events/game-created.event';
import { PlayerJoinedEvent } from '../events/player-joined.event';
import { GameStartedEvent } from '../events/game-started.event';
import { ConflictException } from '@nestjs/common';
import { PlayerMoveEvent } from '../events/player-move.event';
import { GameEndedEvent } from '../events/game-ended.event';
import { AggregateRoot, EventHandler } from 'nestjs-cqrx';

export class Game extends AggregateRoot {
    private player1: string | undefined;
    private player2: string | undefined;
    private moves: { player: string; position: number }[] = [];
    #isGameEnded = false;
    private isGameStarted = false;

    constructor(streamName: string, id: string);
    constructor(id: string);

    // @ts-ignore
    constructor(...args: any[]) {
        if (args.length === 1 && typeof args[0] === 'string') {
            super('Game', args[0]);
        } else if (
            args.length === 2 &&
            typeof args[0] === 'string' &&
            typeof args[1] === 'string'
        ) {
            super(args[0], args[1]);
        } else {
            throw new TypeError('Invalid game constructor call');
        }
    }

    get isGameEnded() {
        return this.#isGameEnded;
    }

    create() {
        this.apply(new GameCreatedEvent());
    }

    getPlayers() {
        return [this.player1, this.player2];
    }

    joinPlayer(playerId: string) {
        this.apply(new PlayerJoinedEvent({ playerId }));
    }

    @EventHandler(PlayerJoinedEvent)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    onPlayerJoined(event: PlayerJoinedEvent) {
        const playerId = event.data.playerId;
        if (!this.player1) {
            this.player1 = playerId;
        } else if (!this.player2) {
            this.player2 = playerId;
        } else {
            throw new Error('All players already joined');
        }
    }

    @EventHandler(GameStartedEvent)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    gameStarted(_: GameStartedEvent) {
        if (this.isGameStarted) {
            throw new Error('Game already started');
        }
        this.isGameStarted = true;
    }

    start() {
        if (!(this.player1 && this.player2)) {
            throw new Error('Not enough players to start');
        }
        this.apply(new GameStartedEvent());
    }

    playerMove(playerId: string, position: number) {
        this.apply(
            new PlayerMoveEvent({
                gameId: this.id,
                playerId,
                position,
            }),
        );
    }

    @EventHandler(PlayerMoveEvent)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    onPlayerMoveEvent(event: PlayerMoveEvent) {
        const { data } = event;
        const { position, playerId } = data;

        const exists = this.moves.find(x => x.position === position);
        if (exists) {
            throw new ConflictException('Position already taken');
        }
        if (this.moves.length > 0) {
            const [lastMove] = this.moves.slice(-1);

            if (lastMove?.player === playerId) {
                throw new Error('Other player turn');
            }
        }

        this.moves.push({
            player: playerId,
            position: position,
        });
    }

    checkEnd() {
        if (this.#isGameEnded) {
            return;
        }
        if (this.moves.length < 5) {
            return;
        }
        if (this.moves.length > 9) {
            throw new Error('Invalid state');
        }

        const winPositionList = [
            [1, 2, 3],
            [4, 5, 6],
            [7, 8, 9],
            [1, 4, 7],
            [2, 5, 8],
            [3, 6, 9],
            [1, 5, 9],
            [3, 5, 9],
            [7, 5, 3],
            [1, 5, 9],
        ];
        let winnerId: string | undefined;

        for (const positions of winPositionList) {
            const moves = this.moves.filter(m => positions.includes(m.position));
            if (
                moves.length === 3 &&
                moves[0]?.player === moves[1]?.player &&
                moves[1]?.player === moves[2]?.player
            ) {
                winnerId = moves[0]?.player;
                break;
            }
        }

        if (winnerId) {
            this.apply(
                new GameEndedEvent({
                    gameId: this.id,
                    winnerId,
                }),
            );
        }
    }

    @EventHandler(GameEndedEvent)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    onGameEndedEvent(_: GameEndedEvent) {
        this.#isGameEnded = true;
    }
}
