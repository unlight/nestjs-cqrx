import { Injectable } from '@nestjs/common';
import { EventStoreService } from './eventstore.service';
import { AggregateRoot } from './aggregate-root';
import { Event } from './event';
import { Constructor } from '@nestjs/cqrs';

export interface IEventPublisher {
    mergeClassContext<T extends Constructor<AggregateRoot<Event>>>(object: T): T;
    mergeObjectContext<T extends AggregateRoot<Event>>(object: T): T;
}

@Injectable()
export class EventPublisher implements IEventPublisher {
    constructor(private readonly eventStoreService: EventStoreService) {}

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    mergeClassContext<T>(metatype: T): T {
        throw new Error('Method mergeClassContext not implemented.');
    }

    mergeObjectContext<T extends AggregateRoot<Event>>(object: T): T {
        object.publish = async event => {
            await this.eventStoreService.appendToStream(object.streamId, event);
        };

        object.publishAll = async events => {
            await this.eventStoreService.appendToStream(object.streamId, events);
        };

        return object;
    }
}
