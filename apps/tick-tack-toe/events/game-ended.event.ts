import { Event } from 'cqrx-core';

type GameEndedEventData = {
  gameId: string;
  winnerId: string;
};

export class GameEndedEvent extends Event<GameEndedEventData> {
  constructor(readonly data: GameEndedEventData) {
    super();
  }
}
