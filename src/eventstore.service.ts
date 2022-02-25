import {
    END,
    EventStoreDBClient,
    FORWARDS,
    jsonEvent,
    ResolvedEvent,
    START,
} from '@eventstore/db-client';
import { Injectable } from '@nestjs/common';
import { TransformService } from './transform.service';
import { Event } from './event';
import { AppendToStreamOptions } from './interfaces';

export type AppendResult = {
    /**
     * The current revision of the stream, to be passed as the `expectedRevision` in the next call.
     */
    expectedRevision: bigint;
};

@Injectable()
export class EventStoreService {
    constructor(
        private readonly client: EventStoreDBClient,
        private readonly transformService: TransformService,
    ) {}

    async *readFromStart(stream: string): AsyncGenerator<Event, void> {
        const streamingRead = this.client.readStream(stream, {
            direction: FORWARDS,
            fromRevision: START,
        });

        for await (const { event } of streamingRead) {
            if (!event) {
                continue;
            }
            const transform = this.transformService.get(event.type);
            yield transform?.(event) ?? event;
        }
    }

    async appendToStream(
        streamId: string,
        events: Event | Event[],
        options?: AppendToStreamOptions,
    ): Promise<AppendResult> {
        {
            const expectedRevision = options?.expectedRevision;
            const databaseEvents = (Array.isArray(events) ? events : [events]).map(
                event =>
                    jsonEvent<any>({
                        type: event.type,
                        data: event.data,
                    }),
            );

            const result = await this.client.appendToStream(streamId, databaseEvents, {
                expectedRevision,
            });
            return {
                expectedRevision: result.nextExpectedRevision,
            };
        }
    }

    subscribeToStream(
        streamId: string,
        listener: (event: Event) => void,
    ): () => Promise<void> {
        const subscription = this.client.subscribeToStream(streamId);

        subscription.on('data', this.createEventstoreEventHandler(listener));

        // eslint-disable-next-line @typescript-eslint/require-await
        return async () => {
            subscription.off('data', listener);
        };
    }

    subscribeToAll(listener: (event: Event) => void): () => Promise<void> {
        const subscription = this.client.subscribeToAll({ fromPosition: END });
        subscription.on('data', this.createEventstoreEventHandler(listener));

        return () => subscription.unsubscribe();
    }

    private createEventstoreEventHandler(listener: (event: Event) => void) {
        return ({ event }: ResolvedEvent) => {
            if (!event) {
                return;
            }
            const transform = this.transformService.get(event.type);

            listener(transform?.(event) ?? event);
        };
    }
}
