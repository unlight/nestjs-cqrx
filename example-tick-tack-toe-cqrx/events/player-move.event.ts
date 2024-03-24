import { Event } from 'nestjs-cqrx';

type PlayerMoveEventData = {
  gameId: string;
  playerId: string;
  position: number;
};

export class PlayerMoveEvent extends Event<PlayerMoveEventData> {}
