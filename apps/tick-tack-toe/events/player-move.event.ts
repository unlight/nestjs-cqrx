import { Event } from 'cqrx-core';

type PlayerMoveEventData = {
  gameId: string;
  playerId: string;
  position: number;
};

export class PlayerMoveEvent extends Event<PlayerMoveEventData> {
  constructor(readonly data: PlayerMoveEventData) {
    super();
  }
}
