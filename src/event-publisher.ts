import { Injectable, Type } from '@nestjs/common';
import { Constructor } from '@nestjs/cqrs';

import { AggregateRoot } from './aggregate-root';
import { NO_STREAM } from './constants';
import { Event } from './event';
import { EventStoreService } from './eventstore.service';

interface IEventPublisher {
  mergeClassContext<T extends Constructor<AggregateRoot<Event>>>(object: T): T;
  mergeObjectContext<T extends AggregateRoot<Event>>(object: T): T;
}

@Injectable()
export class EventPublisher implements IEventPublisher {
  constructor(private readonly eventStoreService: EventStoreService) {}

  private static async publish(
    eventStoreService: EventStoreService,
    aggregate: AggregateRoot,
    events: Event[],
  ) {
    const result = await eventStoreService.appendToStream(
      aggregate.streamId,
      events,
      {
        streamState: aggregate.revision >= 0 ? aggregate.revision : NO_STREAM,
      },
    );

    aggregate.revision = result.nextExpectedRevision;
  }

  mergeClassContext = <T extends Type<AggregateRoot>>(metatype: T): T => {
    const { eventStoreService } = this;

    return class extends metatype {
      async publish(event: Event) {
        return EventPublisher.publish(eventStoreService, this, [event]);
      }

      async publishAll(events: Event[]) {
        return EventPublisher.publish(eventStoreService, this, events);
      }
    };
  };

  mergeObjectContext = <T extends AggregateRoot<Event>>(object: T): T => {
    const { eventStoreService } = this;

    Object.defineProperty(object, 'publish', {
      enumerable: false,
      value: async event => {
        return EventPublisher.publish(eventStoreService, object, [event]);
      },
    });

    Object.defineProperty(object, 'publishAll', {
      enumerable: false,
      value: async events => {
        return EventPublisher.publish(eventStoreService, object, events);
      },
    });

    return object;
  };

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
