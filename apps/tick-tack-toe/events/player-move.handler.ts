import { PlayerMoveEvent } from './player-move.event';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { GameViewRepository } from '../repositories/game-view.repository';

/**
 * Fires from subscription after event is saved to database.
 */
@EventsHandler(PlayerMoveEvent)
export class PlayerMoveHandler implements IEventHandler<PlayerMoveEvent> {
  constructor(private readonly gameViewRepository: GameViewRepository) {}

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  handle(_event: PlayerMoveEvent) {
    this.gameViewRepository.incEvent();
  }
}
