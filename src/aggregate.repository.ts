import { Inject } from '@nestjs/common';

import { AggregateRoot } from './aggregate-root';
import { EventStoreService } from './eventstore.service';
import { Type } from './interfaces';

export function aggregateRepositoryToken(value: { readonly name: string }) {
  return `AggregateRepository${value.name}`;
}

export const InjectAggregateRepository = (
  aggregate: Type<unknown>,
): ParameterDecorator => Inject(aggregateRepositoryToken(aggregate));

export class AggregateRepository<T extends AggregateRoot> {
  constructor(
    private readonly eventStoreService: EventStoreService,
    private readonly Aggregate: Type<T>,
    private readonly streamName: string,
  ) {}

  async findOne(id: string): Promise<T> {
    const aggregate = new this.Aggregate(this.streamName, id);
    const { streamId } = aggregate;
    const streamEvents = this.eventStoreService.readFromStart(streamId);

    for await (const event of streamEvents) {
      await aggregate.applyFromHistory(event);
    }

    return aggregate;
  }

  async save(aggregate: T): Promise<void> {
    const events = aggregate.getUncommittedEvents();
    await this.eventStoreService.appendToStream(aggregate.streamId, events);
    aggregate.uncommit();
    // Commit but no publish
    for (const event of events) {
      await aggregate.applyFromHistory(event);
    }
  }
}
