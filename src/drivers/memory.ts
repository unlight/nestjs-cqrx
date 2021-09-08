import { ok } from 'assert';
import erroz from 'erroz';
import { EventEmitter } from 'events';
import { last } from 'lodash';

import { Event } from '../event';
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

    subscribeToAll(listener: (event) => void) {
        this.emitter.on('data', listener);

        // eslint-disable-next-line @typescript-eslint/require-await
        return async () => {
            this.emitter.off('data', listener);
        };
    }

    subscribeToStream(stream: string, listener: (event) => void) {
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

        if (expectedRevision === 'NO_STREAM' && this.store.has(streamId)) {
            throw new ExpectedNoStream({ streamId });
        } else if (expectedRevision === 'STREAM_EXISTS' && !this.store.has(streamId)) {
            throw new ExpectedStreamExists({ streamId });
        }

        // Expected stream user-s4l1jxeB3Pfl2ff3 exists

        if (!this.store.has(streamId)) {
            this.store.set(streamId, []);
        }

        const streamEvents: Event[] = [];
        if (Array.isArray(events)) {
            streamEvents.push(...events);
        } else if (event) {
            streamEvents.push(event);
        }
        const allEvents = this.store.get(streamId);
        ok(allEvents);
        allEvents.push(...streamEvents);

        if (!this.emitters.has(streamId)) {
            this.emitters.set(streamId, new EventEmitter());
        }

        for (const streamEvent of streamEvents) {
            this.emitters.get(streamId)?.emit('data', streamEvent);
            this.emitter.emit('data', event);
        }

        return {
            expectedRevision: BigInt(allEvents.length),
        };
    }

    async *readFromStart(stream: string): AsyncGenerator<Event, void> {
        const streamEvents = this.store.get(stream);

        if (!streamEvents) {
            throw new Error(`Stream ${stream} not found`);
        }

        for await (const event of streamEvents) {
            yield event;
        }
    }
}

/**
 * @constructor
 * @param options
 * @param options.streamId
 */
const ExpectedNoStream = erroz({
    code: 'EXPECTED_NO_STREAM',
    template: 'Expected no stream, but stream %streamId already exists',
});

/**
 * @constructor
 * @param options
 * @param options.streamId
 */
const ExpectedStreamExists = erroz({
    code: 'EXPECTED_STREAM_EXISTS',
    template: 'Expected stream %streamId exists',
});
