import { lastValueFrom, Observable } from 'rxjs';

import { AGGREGATE_EVENT_HANDLERS } from './constants';
import { Event } from './event';
import { AggregateEventHandlers, EventHandlerFunction, Type } from './interfaces';

const INTERNAL_EVENTS = Symbol('Internal Events');
const VERSION = Symbol('Version');

export abstract class AggregateRoot<E extends Event = Event> {
    private readonly [INTERNAL_EVENTS]: E[] = [];
    private [VERSION] = 0;
    readonly streamId: string;

    constructor(readonly streamName: string, readonly id: string) {
        this.streamId = `${streamName}_${id}`;
    }

    get version(): number {
        return this[VERSION];
    }

    private getEventHandlers(event: E): EventHandlerFunction<E>[] {
        const handlers: AggregateEventHandlers | undefined = Reflect.getMetadata(
            AGGREGATE_EVENT_HANDLERS,
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            Reflect.getPrototypeOf(this)!,
        );

        return (handlers?.get(event.constructor as unknown as Type<E>) ?? []).map(
            key => this[key] as unknown as EventHandlerFunction<E>,
        );
    }

    apply<T extends E = E>(event: T): void {
        this[INTERNAL_EVENTS].push(event);
    }

    async applyFromHistory<T extends E = E>(event: T): Promise<void> {
        const handlers = this.getEventHandlers(event);
        const calls = handlers.map(async handler => {
            const response$ = handler.call(this, event);
            if (response$ instanceof Observable) {
                await lastValueFrom(response$);
            }
        });
        await Promise.all(calls);
        this[VERSION] += 1;
    }

    async commit(): Promise<void> {
        const applies = this[INTERNAL_EVENTS].map(event =>
            this.applyFromHistory(event),
        );
        await Promise.all(applies);
        const events = this.getUncommittedEvents();
        this[INTERNAL_EVENTS].length = 0;
        await this.publishAll(events);
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async loadFromHistory(history: E[]): Promise<void> {
        for (const event of history) {
            await this.applyFromHistory(event);
        }
    }

    getUncommittedEvents(): E[] {
        return [...this[INTERNAL_EVENTS]];
    }

    uncommit(): void {
        this[INTERNAL_EVENTS].length = 0;
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    publish<T extends E = E>(event: T): Promise<void> {
        throw new Error('publish method must be overriden.');
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    publishAll<T extends E = E>(events: T[]): Promise<void> {
        throw new Error('publishAll method must be overriden.');
    }
}
