import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { StartGameCommand } from './start-game.command';
import { NotFoundException } from '@nestjs/common';
import { GameRepository } from '../repositories/game.repository';
import { EventPublisher } from 'nestjs-cqrx';

@CommandHandler(StartGameCommand)
export class StartGameHandler implements ICommandHandler<StartGameCommand> {
    constructor(
        private readonly publisher: EventPublisher,
        private readonly gameRepository: GameRepository,
    ) {}

    async execute(command: StartGameCommand) {
        const { id } = command;
        let game = await this.gameRepository.findOne(id);
        if (!game) {
            throw new NotFoundException(game);
        }
        game = this.publisher.mergeObjectContext(game);

        game.start();

        await game.commit();

        return id;
    }
}
