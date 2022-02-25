import { Event } from 'nestjs-cqrx';

export class GameCreatedEvent extends Event {
    constructor() {
        super({});
    }
}
