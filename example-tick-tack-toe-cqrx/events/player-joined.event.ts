import { Event } from 'nestjs-cqrx';

type PlayerJoinedEventData = {
    playerId: string;
};

export class PlayerJoinedEvent extends Event<PlayerJoinedEventData> {}
