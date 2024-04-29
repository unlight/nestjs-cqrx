import { Injectable, Type } from '@nestjs/common';
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

  mergeClassContext<T extends Type<AggregateRoot>>(metatype: T): T {
    const eventStoreService = this.eventStoreService;

    return class extends metatype {
      async publish(event: Event) {
        await eventStoreService.appendToStream(this.streamId, event);
      }

      async publishAll(events: Event[]) {
        await eventStoreService.appendToStream(this.streamId, events);
      }
    };
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

  async publish<T extends AggregateRoot<Event>, E extends Event>(
    object: T,
    event: E | E[],
  ): Promise<void>;
  async publish<E extends Event>(streamId: string, event: E): Promise<void>;

  async publish<E extends Event>(
    objectOrStreamId: AggregateRoot<Event> | string,
    event: E | E[],
  ): Promise<void> {
    const streamId =
      typeof objectOrStreamId === 'string'
        ? objectOrStreamId
        : objectOrStreamId.streamId;
    await this.eventStoreService.appendToStream(streamId, event);
  }
}
