import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PlayerJoinCommand } from './player-join.command';
import { GameRepository } from '../repositories/game.repository';
import { NotFoundException } from '@nestjs/common';
import { EventPublisher } from 'nestjs-cqrx';

@CommandHandler(PlayerJoinCommand)
export class PlayerJoinHandler implements ICommandHandler<PlayerJoinCommand> {
    constructor(
        private readonly publisher: EventPublisher,
        private readonly gameRepository: GameRepository,
    ) {}

    async execute(command: PlayerJoinCommand) {
        const { gameId, playerId } = command;
        let game = await this.gameRepository.findOne(gameId);
        if (!game) {
            throw new NotFoundException(game);
        }
        game = this.publisher.mergeObjectContext(game);
        game.joinPlayer(playerId);

        await game.commit();

        return playerId;
    }
}
