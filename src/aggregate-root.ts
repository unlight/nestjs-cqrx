import { lastValueFrom, Observable } from 'rxjs';

import { AGGREGATE_ROOT_HANDLERS } from './constants';
import { Event } from './event';
import { AggregateHandlerMetadata, HandlerFunction } from './interfaces';

const INTERNAL_EVENTS = Symbol('Internal Events');
const VERSION = Symbol('Version');

export abstract class AggregateRoot<E extends Event = Event> {
    private readonly [INTERNAL_EVENTS]: E[] = [];
    private [VERSION] = -1;
    readonly streamId: string;
    constructor(streamName: string, id: string) {
        this.streamId = `${streamName}-${id}`;
    }

    get version(): number {
        return this[VERSION];
    }

    protected getEventHandlers(event: E): Array<HandlerFunction<E>> {
        const handlers: AggregateHandlerMetadata[] = Reflect.getMetadata(
            AGGREGATE_ROOT_HANDLERS,
            Reflect.getPrototypeOf(this) ?? {},
        );

        return handlers
            .filter(handler => event instanceof handler.event)
            .map(({ key }) => this[key as keyof this] as unknown as HandlerFunction<E>);
    }

    protected getEventName(event: Event): string {
        // eslint-disable-next-line @typescript-eslint/ban-types
        const prototype: Function = Object.getPrototypeOf(event);
        return prototype.constructor.name;
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    protected getEventHandler<T extends E = E>(event: T): Function | undefined {
        throw new Error('getEventHandler method not implemented.');
    }

    async apply<T extends E = E>(event: T, isFromHistory = false): Promise<void> {
        if (isFromHistory) {
            const handlers = this.getEventHandlers(event);
            const calls = handlers.map(async handler => {
                const response$ = handler.call(this, event);
                if (response$ && response$ instanceof Observable) {
                    await lastValueFrom(response$);
                }
            });
            await Promise.all(calls);
            this[VERSION] += 1;
            return;
        }

        this[INTERNAL_EVENTS].push(event);
    }

    async commit(): Promise<void> {
        const applies = this[INTERNAL_EVENTS].map(async event => {
            await this.apply(event, true);
            this.publish(event);
        });

        await Promise.all(applies);

        this[INTERNAL_EVENTS].length = 0;
    }

    getUncommittedEvents(): E[] {
        return [...this[INTERNAL_EVENTS]];
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-empty-function
    publish<T extends E = E>(event: T): void {}

    uncommit(): void {
        throw new Error('uncommit method not implemented.');
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    loadFromHistory(history: E[]): void {
        throw new Error('loadFromHistory method not implemented.');
    }
}
