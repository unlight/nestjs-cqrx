import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { NotFoundException } from '@nestjs/common';
import { EventPublisher } from 'cqrx-core';
import { ICommand } from '@nestjs/cqrs';

import { GameRepository } from '../repositories/game.repository.js';

export class StartGameCommand implements ICommand {
  constructor(readonly id: string) {}
}

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
