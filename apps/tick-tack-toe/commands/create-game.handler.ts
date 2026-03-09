import { CommandHandler, ICommand } from '@nestjs/cqrs';
import { CreateGameCommand } from './create-game.command.js';
import { Game } from '../models/game.model.js';
import { createId } from '@paralleldrive/cuid2';
import { GameCreatedDtoReponse } from '../dto/game-created-dto.reponse.js';
import { GameRepository } from '../repositories/game.repository.js';
import { EventPublisher } from 'cqrx-core';

@CommandHandler(CreateGameCommand)
export class CreateGameHandler implements ICommand {
  constructor(
    private readonly gameRepository: GameRepository,
    private readonly eventPublisher: EventPublisher,
  ) {}

  async execute() {
    const id = createId();
    const game = this.eventPublisher.mergeObjectContext(new Game(id));

    game.create();

    await game.commit();

    return new GameCreatedDtoReponse(game.id);
  }

  async execute_2() {
    const id = createId();
    const game = new Game(id);

    game.create();

    await this.gameRepository.save(game);

    return new GameCreatedDtoReponse(game.id);
  }
}
