import 'reflect-metadata';
import { lastValueFrom, Observable } from 'rxjs';

import { AGGREGATE_EVENT_HANDLERS } from './constants.js';
import type {
  AggregateEventHandlers,
  EventHandlerFunction,
  Type,
} from './interfaces.ts';
import { Event } from './event.js';

export abstract class AggregateRoot {
  protected static readonly aggregateType: string = '';
  readonly #internalEvents: Event[] = [];
  #version = 0;
  /**
   * Aggregate type + aggregate id.
   */
  readonly stream: string;
  /**
   * Stream suffix identifier (cuid, guid, etc.)
   */
  readonly aggregateId: string;

  constructor(aggregateId: string) {
    const ctor = this.constructor;
    const aggregateType =
      ('aggregateType' in ctor &&
        typeof ctor.aggregateType === 'string' &&
        ctor.aggregateType) ||
      ctor.name;

    this.aggregateId = aggregateId;
    this.stream = `${aggregateType}_${aggregateId}`;
  }

  get version(): number {
    return this.#version;
  }

  private getEventHandlers(event: Event): EventHandlerFunction<Event>[] {
    const handlers: AggregateEventHandlers | undefined = Reflect.getMetadata(
      AGGREGATE_EVENT_HANDLERS,
      Reflect.getPrototypeOf(this)!,
    ) as AggregateEventHandlers | undefined;

    return (
      handlers?.get(event.constructor as unknown as Type<Event>) ?? []
    ).map(key => this[key] as unknown as EventHandlerFunction<Event>);
  }

  apply(event: Event<any>): void {
    this.#internalEvents.push(event);
  }

  async callEventHandlers<E extends Event>(event: E): Promise<void> {
    const handlers = this.getEventHandlers(event);
    const calls = handlers.map(async handler => {
      const response$ = handler.call(this, event);
      if (response$ instanceof Observable) {
        await lastValueFrom(response$);
      }
    });
    await Promise.all(calls);
  }

  async applyFromHistory<E extends Event>(event: E): Promise<void> {
    await this.callEventHandlers(event);
    this.#version += 1;
  }

  async commit(): Promise<void> {
    const events = this.getUncommittedEvents();
    this.#internalEvents.length = 0;

    for (const event of events) {
      await this.callEventHandlers(event);
    }

    await this.publishAll(events);
  }

  getUncommittedEvents() {
    return [...this.#internalEvents];
  }

  uncommit(): void {
    this.#internalEvents.length = 0;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  publish<E extends Event>(event: E): Promise<void> {
    throw new Error('publish method must be overriden');
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  publishAll<E extends Event>(events: E[]): Promise<void> {
    throw new Error('publishAll method must be overriden');
  }
}
