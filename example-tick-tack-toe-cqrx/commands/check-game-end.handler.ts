import { CommandHandler, ICommand } from '@nestjs/cqrs';
import { GameRepository } from '../repositories/game.repository';
import { CheckGameEndCommand } from './check-game-end.command';
import { NotFoundException } from '@nestjs/common';
import { EventPublisher } from 'nestjs-cqrx';

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
