import { Event } from 'nestjs-cqrx';

export class GameStartedEvent extends Event {
  constructor() {
    super({});
  }
}
