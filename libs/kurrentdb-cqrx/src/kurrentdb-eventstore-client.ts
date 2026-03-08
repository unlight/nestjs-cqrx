import {
  jsonEvent,
  KurrentDBClient,
  NO_STREAM,
  RecordedEvent,
  STREAM_EXISTS,
} from '@kurrent/kurrentdb-client';
import type {
  IApplyArgs,
  IApplyResult,
  ICreateArgs,
  ICreateResult,
  IStoredEvent,
  IEventStoreClient,
  IGetEventArgs,
} from 'cqrx-core';
import type { ClientOptions } from './interfaces.js';

export function createKurrentdbEventstoreClient(options: ClientOptions) {
  const { connectionString } = options;
  const client = KurrentDBClient.connectionString(connectionString);
  const eventstoreClient = new KurrentdbEventStoreClient(client);

  return Promise.resolve(eventstoreClient);
}

export class KurrentdbEventStoreClient implements IEventStoreClient {
  constructor(private readonly kurrentDbClient: KurrentDBClient) {}

  async create(args: ICreateArgs): Promise<ICreateResult> {
    const { aggregateId, aggregateType, eventData, eventType, metadata } = args;
    const streamId = `${aggregateType}_${aggregateId}`;
    const dataEvent = jsonEvent({
      type: eventType,
      data: eventData,
      metadata,
    });
    const createResult = await this.kurrentDbClient.appendToStream(
      streamId,
      dataEvent,
      { streamState: NO_STREAM },
    );
    const version = createResult.nextExpectedRevision;

    return { version };
  }

  async apply(args: IApplyArgs): Promise<IApplyResult> {
    const { aggregateId, aggregateType, eventData, eventType, metadata } = args;
    const streamId = `${aggregateType}_${aggregateId}`;
    const dataEvent = jsonEvent({
      type: eventType,
      data: eventData,
      metadata,
    });
    const result = await this.kurrentDbClient.appendToStream(
      streamId,
      dataEvent,
      { streamState: STREAM_EXISTS },
    );
    const version = result.nextExpectedRevision;

    return { version };
  }

  async *read(args: IGetEventArgs): AsyncIterableIterator<IStoredEvent> {
    const { aggregateType, aggregateId } = args;
    const streamId = `${aggregateType}_${aggregateId}`;
    const eventIterator = this.kurrentDbClient.readStream(streamId);

    for await (const { event } of eventIterator) {
      if (event) yield this.createEvent(event);
    }
  }

  /**
   * Transform database event to common event interface
   */
  private createEvent(event: RecordedEvent): IStoredEvent<any> {
    return {
      created: event.created,
      data: event.data,
      id: event.id,
      metadata: event.metadata,
      stream: event.streamId,
      type: event.type,
      version: BigInt(event.revision),
    };
  }

  async disconnect(): Promise<void> {
    await this.kurrentDbClient.dispose();
  }
}
