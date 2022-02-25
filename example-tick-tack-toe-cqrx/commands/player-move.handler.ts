import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PlayerMoveCommand } from './player-move.command';
import { GameRepository } from '../repositories/game.repository';
import { NotFoundException } from '@nestjs/common';
import { EventPublisher } from 'nestjs-cqrx';

@CommandHandler(PlayerMoveCommand)
export class PlayerMoveHandler implements ICommandHandler<PlayerMoveCommand> {
    constructor(
        private readonly publisher: EventPublisher,
        private readonly gameRepository: GameRepository,
    ) {}

    async execute(command: PlayerMoveCommand) {
        const {
            input: { playerId, position, gameId },
        } = command;
        let game = await this.gameRepository.findOne(gameId);
        if (!game) {
            throw new NotFoundException();
        }
        game = this.publisher.mergeObjectContext(game);
        game.playerMove(playerId, position);
        await game.commit();

        return { playerId, position };
    }
}
