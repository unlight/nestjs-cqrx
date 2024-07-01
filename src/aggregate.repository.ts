import { Inject } from '@nestjs/common';

import { AggregateRoot } from './aggregate-root';
import { AppendResult, EventStoreService } from './eventstore.service';
import { Type } from './interfaces';
import { EventPublisher } from './event-publisher';

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
  ) {}

  create(id: string): T {
    const aggregate: T = new this.Aggregate(id);
    const eventPublisher = new EventPublisher(this.eventStoreService);
    eventPublisher.mergeObjectContext(aggregate);

    return aggregate;
  }

  async streamIdAndAggregate(argument: T): Promise<[string, T]>;
  async streamIdAndAggregate(argument: string): Promise<[string, T]>;
  async streamIdAndAggregate(argument: string | T): Promise<[string, T]>;
  /**
   * Return stream id (uid) and aggregate
   */
  async streamIdAndAggregate(argument: unknown): Promise<[string, T]> {
    if (typeof argument === 'string') {
      const aggregate = await this.load(argument);
      return [argument, aggregate];
    } else if (argument instanceof AggregateRoot) {
      return [argument.id, argument as T];
    }
    throw new TypeError('Invalid argument, expected string or aggregate');
  }

  /**
   * Read events from stream id (uid) and apply
   */
  async load(id: string): Promise<T> {
    const aggregate = new this.Aggregate(id);
    const streamEvents = this.eventStoreService.readFromStart(aggregate.streamId);

    for await (const event of streamEvents) {
      await aggregate.applyFromHistory(event);
    }

    return aggregate;
  }

  /**
   * Get uncommited events from aggregate and append to stream
   */
  async save(aggregate: T): Promise<AppendResult> {
    const events = aggregate.getUncommittedEvents();
    // Commit, but no publish
    for (const event of events) {
      await aggregate.callEventHandlers(event);
    }
    const result = await this.eventStoreService.appendToStream(
      aggregate.streamId,
      events,
    );
    aggregate.uncommit();

    return result;
  }
}
