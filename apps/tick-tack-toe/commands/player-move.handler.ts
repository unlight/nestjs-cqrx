import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { NotFoundException } from '@nestjs/common';
import { EventPublisher } from 'cqrx-core';

import { PlayerMoveCommand } from './player-move.command.js';
import { GameRepository } from '../repositories/game.repository.js';

@CommandHandler(PlayerMoveCommand)
export class PlayerMoveHandler implements ICommandHandler<PlayerMoveCommand> {
  constructor(
    private readonly publisher: EventPublisher,
    private readonly gameRepository: GameRepository,
  ) {}

  async execute(command: PlayerMoveCommand) {
    const { input } = command;
    const { playerId, position, gameId } = input;
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
