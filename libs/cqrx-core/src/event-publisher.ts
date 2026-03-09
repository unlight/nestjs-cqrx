import { AggregateRoot } from './aggregate-root.ts';
import { EventStoreService } from './eventstore.service.ts';
import type { Constructor, Type } from './interfaces.ts';
import type { Event } from './event.ts';
import { AggregateRepository } from './aggregate.repository.ts';

interface IEventPublisher {
  mergeClassContext<T extends Constructor<AggregateRoot>>(object: T): T;
  mergeObjectContext<T extends AggregateRoot>(object: T): T;
}

export class EventPublisher implements IEventPublisher {
  constructor(private readonly eventStoreService: EventStoreService) {}

  private static async publish(
    aggregate: AggregateRoot,
    eventStoreService: EventStoreService,
    events: Event[],
  ) {
    await AggregateRepository.save({ aggregate, eventStoreService, events });
  }

  mergeClassContext = <T extends Type<AggregateRoot>>(metatype: T): T => {
    const { eventStoreService } = this;
    return class extends metatype {
      async publish(event: Event) {
        return EventPublisher.publish(this, eventStoreService, [event]);
      }
      async publishAll(events: Event[]) {
        return EventPublisher.publish(this, eventStoreService, events);
      }
    };
  };

  mergeObjectContext = <T extends AggregateRoot>(object: T): T => {
    const { eventStoreService } = this;
    Object.defineProperty(object, 'publish', {
      enumerable: false,
      value: async event => {
        return EventPublisher.publish(object, eventStoreService, [event]);
      },
    });
    Object.defineProperty(object, 'publishAll', {
      enumerable: false,
      value: async events => {
        return EventPublisher.publish(object, eventStoreService, events);
      },
    });
    return object;
  };
}
