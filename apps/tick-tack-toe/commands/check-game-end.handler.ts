import { CommandHandler, ICommand } from '@nestjs/cqrs';
import { NotFoundException } from '@nestjs/common';
import { EventPublisher } from 'cqrx-core';

import { GameRepository } from '../repositories/game.repository.js';
import { CheckGameEndCommand } from './check-game-end.command.js';

@CommandHandler(CheckGameEndCommand)
export class CheckGameEndHandler implements ICommand {
  constructor(
    private readonly publisher: EventPublisher,
    private readonly gameRepository: GameRepository,
  ) {}

  async execute(command: CheckGameEndCommand) {
    const { id } = command;
    let game = await this.gameRepository.findOne(id);
    if (!game) {
      throw new NotFoundException(id);
    }
    game = this.publisher.mergeObjectContext(game);
    game.checkEnd();

    await game.commit();
  }
}
