import { AggregateRoot } from './aggregate-root.ts';
import { EventStoreService } from './eventstore.service.ts';
import type { Type } from './interfaces.ts';

export class AggregateRepository<T extends AggregateRoot> {
  constructor(
    private readonly eventStoreService: EventStoreService,
    private readonly Aggregate: Type<T>,
  ) {}

  /**
   * Read events from stream id (uid) and apply
   */
  async load(id: string): Promise<T> {
    const aggregate = new this.Aggregate(id);
    // this.eventPublisher.mergeObjectContext(aggregate);
    const eventIterator = this.eventStoreService.read(aggregate.stream);

    for await (const event of eventIterator) {
      await aggregate.applyFromHistory(event);
    }

    return aggregate;
  }

  /**
   * Get uncommited events from aggregate and append to stream
   */
  async save(aggregate: T): Promise<void> {
    const events = aggregate.getUncommittedEvents();

    if (aggregate.version === 0) {
      const event = events.shift();
      if (event) {
        await this.eventStoreService.create(aggregate.stream, event);
        await aggregate.callEventHandlers(event);
      }
    }

    // Commit, but no publish
    for (const event of events) {
      await this.eventStoreService.apply(aggregate.stream, event);
      await aggregate.callEventHandlers(event);
    }

    aggregate.uncommit();
  }
}
