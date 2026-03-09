import { Event } from 'cqrx-core';

type PlayerJoinedEventData = {
  playerId: string;
};

export class PlayerJoinedEvent extends Event<PlayerJoinedEventData> {
  constructor(readonly data: PlayerJoinedEventData) {
    super();
  }
}
