import { ok } from 'assert';
import { EventEmitter } from 'events';
import { last } from 'lodash';

import { Event } from '../event';
import { StreamNotFound, WrongExpectedVersion } from './errors';
import { AppendResult, AppendStreamOptions, IStore } from './store.interface';

export class Memory implements IStore {
    private readonly store = new Map<string, Event[]>();
    /**
     * Stream emitter.
     */
    private readonly emitters = new Map<string, EventEmitter>();
    /**
     * All events emitter.
     */
    private readonly emitter = new EventEmitter();

    private static createEvent({
        event,
        streamId,
        previousRevision,
    }: {
        event: Event;
        streamId: string;
        previousRevision: number;
    }): Event {
        const streamEvent = new Event(JSON.parse(JSON.stringify(event.data)));
        Reflect.set(
            streamEvent,
            'id',
            `${Math.random().toString(36).slice(2)}-${streamId}`,
        );
        Reflect.set(streamEvent, 'streamId', streamId);
        Reflect.set(streamEvent, 'revision', BigInt(previousRevision + 1));
        Reflect.set(streamEvent, 'created', Date.now());

        return streamEvent;
    }
    subscribeToAll(listener: (event: any) => void) {
        this.emitter.on('data', listener);

        // eslint-disable-next-line @typescript-eslint/require-await
        return async () => {
            this.emitter.off('data', listener);
        };
    }

    subscribeToStream(stream: string, listener: (event: any) => void) {
        if (!this.emitters.has(stream)) {
            this.emitters.set(stream, new EventEmitter());
        }
        this.emitters.get(stream)?.on('data', listener);

        // eslint-disable-next-line @typescript-eslint/require-await
        return async () => {
            this.emitters.get(stream)?.off('data', listener);
        };
    }

    // eslint-disable-next-line @typescript-eslint/require-await
    async appendToStream(options: AppendStreamOptions): Promise<AppendResult> {
        const { streamId, event, events, expectedRevision } = options;
        const streamEvents: Event[] = [];

        if (
            (expectedRevision === 'no_stream' && this.store.has(streamId)) ||
            (expectedRevision === 'stream_exists' && !this.store.has(streamId))
        ) {
            throw new WrongExpectedVersion({
                streamId,
                expectedRevision,
            });
        }

        if (!this.store.has(streamId)) {
            this.store.set(streamId, []);
        }

        const allEvents = this.store.get(streamId);
        ok(allEvents);

        if (Array.isArray(events)) {
            streamEvents.push(
                ...events.map((event, index) =>
                    Memory.createEvent({
                        event,
                        streamId,
                        previousRevision: allEvents.length + index,
                    }),
                ),
            );
        } else if (event) {
            const streamEvent = Memory.createEvent({
                event,
                streamId,
                previousRevision: allEvents.length,
            });
            streamEvents.push(streamEvent);
        }

        if (typeof expectedRevision === 'bigint') {
            const lastEvent = last(allEvents);
            ok(
                lastEvent?.revision === expectedRevision,
                new WrongExpectedVersion({
                    streamId,
                    expectedRevision,
                    actualVersion: lastEvent?.revision,
                }),
            );
        }

        allEvents.push(...streamEvents);

        if (!this.emitters.has(streamId)) {
            this.emitters.set(streamId, new EventEmitter());
        }

        for (const streamEvent of streamEvents) {
            this.emitters.get(streamId)?.emit('data', streamEvent);
            this.emitter.emit('data', streamEvent);
        }

        return {
            expectedRevision: BigInt(allEvents.length),
        };
    }

    async *readFromStart(streamId: string): AsyncGenerator<Event, void> {
        const streamEvents = this.store.get(streamId);

        if (!streamEvents) {
            throw new StreamNotFound({ streamId });
        }

        for await (const event of streamEvents) {
            yield event;
        }
    }
}
