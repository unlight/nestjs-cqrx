import { streamToAggregate } from './utils.ts';
import { TransformService } from './transform.service.ts';
import { Event } from './event.ts';
import type { ICreateResult, IEventStoreClient } from './eventstore-client.ts';

export class EventStoreService {
  constructor(
    private readonly eventStoreClient: IEventStoreClient,
    private readonly transformService: TransformService,
  ) {}

  async create(stream: string, event: Event): Promise<ICreateResult> {
    {
      const { aggregateId, aggregateType } = streamToAggregate(stream);

      return this.eventStoreClient.create({
        aggregateId,
        aggregateType,
        eventType: event.type,
        eventData: event.data,
        metadata: event.metadata,
      });
    }
  }

  async apply(stream: string, event: Event) {
    const { aggregateId, aggregateType } = streamToAggregate(stream);

    return this.eventStoreClient.apply({
      aggregateId,
      aggregateType,
      eventType: event.type,
      eventData: event.data,
      metadata: event.metadata,
    });
  }

  async *read(stream: string) {
    const { aggregateId, aggregateType } = streamToAggregate(stream);
    const eventIterator = this.eventStoreClient.read({
      aggregateId,
      aggregateType,
    });

    for await (const event of eventIterator) {
      const transform = this.transformService.get(event.type);
      yield transform?.(event) ?? event;
    }
  }
}
