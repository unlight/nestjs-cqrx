import { Event } from 'nestjs-cqrx';

type GameEndedEventData = {
  gameId: string;
  winnerId: string;
};

export class GameEndedEvent extends Event<GameEndedEventData> {}
