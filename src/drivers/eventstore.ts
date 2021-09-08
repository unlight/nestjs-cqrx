import {
    END,
    EventStoreDBClient,
    FORWARDS,
    jsonEvent,
    START,
} from '@eventstore/db-client';

import { Event } from '../event';
import { AppendResult, AppendStreamOptions, IStore } from './store.interface';

export class EventStore implements IStore {
    private readonly client: EventStoreDBClient;
    constructor(connectionString: string) {
        this.client = EventStoreDBClient.connectionString(connectionString);
    }

    async *readFromStart(stream: string): AsyncGenerator<Event, void> {
        const streamEvents = this.client.readStream(stream, {
            direction: FORWARDS,
            fromRevision: START,
        });

        for await (const streamEvent of streamEvents) {
            const event = streamEvent.event;
            if (event) {
                yield event;
            }
        }
    }

    async appendToStream(options: AppendStreamOptions): Promise<AppendResult> {
        {
            const { streamId } = options;
            const events = Array.isArray(options.events)
                ? options.events
                : [options.event];

            const databaseEvents = (events as Event[]).map(event =>
                jsonEvent<any>({
                    type: event.type,
                    data: event.data,
                }),
            );

            const result = await this.client.appendToStream(streamId, databaseEvents);

            return {
                expectedRevision: result.nextExpectedRevision,
            };
        }
    }

    subscribeToStream(
        streamId: string,
        listener: (event: any) => void,
    ): () => Promise<void> {
        const subscription = this.client.subscribeToStream(streamId);
        subscription.on('data', listener);

        // eslint-disable-next-line @typescript-eslint/require-await
        return async () => {
            subscription.off('data', listener);
        };
    }

    subscribeToAll(listener: (event: any) => void): () => Promise<void> {
        const subscription = this.client.subscribeToAll({ fromPosition: END });

        subscription.on('data', function eventstoreEventHandler(streamEvent) {
            listener(streamEvent.event);
        });

        return () => subscription.unsubscribe();
    }
}
