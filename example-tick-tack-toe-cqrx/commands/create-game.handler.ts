import { CommandHandler, ICommand } from '@nestjs/cqrs';
import { CreateGameCommand } from './create-game.command';
import { Game } from '../models/game.model';
import cuid from 'cuid';
import { GameCreatedDtoReponse } from '../dto/game-created-dto.reponse';
import { GameRepository } from '../repositories/game.repository';
import { EventPublisher } from 'nestjs-cqrx';

@CommandHandler(CreateGameCommand)
export class CreateGameHandler implements ICommand {
    constructor(
        private readonly gameRepository: GameRepository,
        private readonly eventPublisher: EventPublisher,
    ) {}

    async execute() {
        const id = cuid();
        const game = this.eventPublisher.mergeObjectContext(new Game(id));
        await game.create();
        await game.commit();

        return new GameCreatedDtoReponse(game.id);
    }

    async execute_2() {
        const id = cuid();
        const game = new Game(id);
        await game.create();
        await this.gameRepository.save(game);

        return new GameCreatedDtoReponse(game.id);
    }
}
