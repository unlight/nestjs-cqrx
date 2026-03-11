import type {
  IApplyArgs,
  ICreateArgs,
  IEventStoreClient,
  IGetEventArgs,
  ICreateResult,
  IApplyResult,
  IStoredEvent,
  ReadableSubscription,
} from 'cqrx-core';
import type { ClientOptions, DbxClient, IEventResult } from './interfaces.ts';

export async function createEventdbxEventstoreClient(options: ClientOptions) {
  const { createClient } = await import('eventdbxjs');
  const clientOptions = Object.assign(
    {
      ip: '127.0.0.1',
      port: 6363,
      tenantId: 'default',
    },
    options,
  );
  const client = createClient(clientOptions);

  await client.connect();

  return new EventdbxEventstoreClient(client);
}

type IConfigureOptions = {
  pageOptionsTake?: number;
};

export class EventdbxEventstoreClient implements IEventStoreClient {
  private pageOptionsTake = 100;

  constructor(private readonly client: DbxClient) {}

  configure(options: IConfigureOptions) {
    if (options.pageOptionsTake) this.pageOptionsTake = options.pageOptionsTake;
  }

  async create(args: ICreateArgs): Promise<ICreateResult> {
    const { aggregateType, aggregateId, eventType, eventData, metadata } = args;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const createResult: IEventResult = await this.client.create(
      aggregateType,
      aggregateId,
      eventType,
      { payload: eventData, metadata },
    );
    const version = BigInt(createResult.version);

    return { version };
  }

  async apply(args: IApplyArgs): Promise<IApplyResult> {
    const { aggregateType, aggregateId, eventType, eventData, metadata } = args;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const result: IEventResult = await this.client.apply(
      aggregateType,
      aggregateId,
      eventType,
      { payload: eventData, metadata },
    );
    const version = BigInt(result.version);

    return { version };
  }

  async *read(args: IGetEventArgs): AsyncIterableIterator<IStoredEvent> {
    const { aggregateType, aggregateId } = args;
    const take = this.pageOptionsTake;
    let cursor;

    while (true) {
      const { items, nextCursor } = await this.client.events(
        aggregateType,
        aggregateId,
        { take, cursor },
      );
      for (const event of items) {
        yield this.createEvent(event);
      }

      if (!nextCursor) break;

      cursor = nextCursor;
    }
  }

  /**
   * Transform database event to common event interface
   */
  private createEvent(event: IEventResult): IStoredEvent {
    const { aggregateId, aggregateType, metadata, version } = event;
    const stream = `${aggregateType}_${aggregateId}`;

    return {
      created: new Date(metadata.createdAt),
      data: event.payload,
      id: metadata.eventId,
      metadata,
      stream,
      type: event.eventType,
      version: BigInt(version),
    };
  }

  async disconnect(): Promise<void> {
    await this.client.disconnect();
  }

  subscribeToAll(
    eventListener: (event: IStoredEvent) => void,
    errorListener: (error: Error) => void,
  ): ReadableSubscription {
    throw new Error('Not implemented');
  }
}
