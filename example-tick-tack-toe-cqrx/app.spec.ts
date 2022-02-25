import { INestApplication, ValidationPipe } from '@nestjs/common';
import { CommandBus, EventBus, ofType } from '@nestjs/cqrs';
import { Test } from '@nestjs/testing';

import { AppModule } from './app.module';
import { CreateGameCommand } from './commands/create-game.command';
import { PlayerJoinCommand } from './commands/player-join.command';
import { GameCreatedDtoReponse } from './dto/game-created-dto.reponse';
import { StartGameCommand } from './commands/start-game.command';
import { PlayerMoveCommand } from './commands/player-move.command';
import { GameRepository } from './repositories/game.repository';
import { map, take } from 'rxjs/operators';
import { lastValueFrom } from 'rxjs';
import { GameEndedEvent } from './events/game-ended.event';

describe('tick-tack-toe', () => {
    let app: INestApplication;
    let gameId: string;
    let commandBus: CommandBus;
    beforeAll(async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();
        app = moduleRef.createNestApplication();
        app.enableCors();
        app.useGlobalPipes(new ValidationPipe({}));
        await app.init();

        commandBus = app.get(CommandBus);
    });

    afterAll(async () => {
        await app.close();
    });

    it('full game events', async () => {
        const events = app.get(EventBus);
        const gameEndData$ = lastValueFrom(
            events.pipe(
                ofType(GameEndedEvent),
                take(1),
                map(event => event.data),
            ),
        );
        const { id: gameId } = await commandBus.execute<
            CreateGameCommand,
            GameCreatedDtoReponse
        >(new CreateGameCommand());
        const gameRepository = app.get(GameRepository);
        let game = await gameRepository.findOne(gameId);
        if (!game) {
            throw new Error('Game not found');
        }

        game.joinPlayer('1');
        game.joinPlayer('2');
        await gameRepository.save(game);

        game = (await gameRepository.findOne(gameId))!;
        game.start();
        await gameRepository.save(game);

        game = (await gameRepository.findOne(gameId))!;
        expect(game.getPlayers()).toEqual([expect.any(String), expect.any(String)]);

        game.playerMove('1', 1);
        game.playerMove('2', 7);
        game.playerMove('1', 2);

        await gameRepository.save(game);

        game.playerMove('2', 8);

        await gameRepository.save(game);

        game.playerMove('1', 3);

        await gameRepository.save(game);

        expect(await gameEndData$).toEqual(
            expect.objectContaining({ winnerId: '1', gameId }),
        );
    });

    it('create game', async () => {
        const gameDto = await commandBus.execute<
            CreateGameCommand,
            GameCreatedDtoReponse
        >(new CreateGameCommand());
        expect(gameDto).toBeTruthy();

        gameId = gameDto.id;
    });

    it('players join the game', async () => {
        // Join player 1
        const result1 = await commandBus.execute(new PlayerJoinCommand(gameId, '1'));
        expect(result1).toBeTruthy();
        // Join player 2
        const result2 = await commandBus.execute(new PlayerJoinCommand(gameId, '2'));
        expect(result2).toBeTruthy();
    });

    it('start game', async () => {
        await commandBus.execute(new StartGameCommand(gameId));
    });

    it('player 1 move', async () => {
        await commandBus.execute(
            new PlayerMoveCommand({
                gameId,
                playerId: '1',
                position: 5,
            }),
        );
    });

    it('player 2 move', async () => {
        await commandBus.execute(
            new PlayerMoveCommand({
                gameId,
                playerId: '2',
                position: 1,
            }),
        );
    });
});
