import { lastValueFrom, Observable } from 'rxjs';

import { AGGREGATE_EVENT_HANDLERS } from './constants';
import { Event } from './event';
import { AggregateEventHandlers, EventHandlerFunction, Type } from './interfaces';

export abstract class AggregateRoot<E extends Event = Event> {
  protected static readonly streamName: string = '';
  readonly #INTERNAL_EVENTS: E[] = [];
  #VERSION = 0;
  #REVISION: bigint = -1n;
  /**
   * Stream name without suffix identifier
   */
  readonly streamId: string;
  /**
   * Stream suffix identifier (cuid, guid, etc.)
   */
  readonly id: string;

  constructor(id: string) {
    const streamName =
      ('streamName' in this.constructor &&
        typeof this.constructor.streamName === 'string' &&
        this.constructor.streamName) ||
      this.constructor.name;

    this.id = id;
    this.streamId = `${streamName}_${id}`;
  }

  get version(): number {
    return this.#VERSION;
  }

  get revision(): bigint {
    return this.#REVISION;
  }

  set revision(value: bigint) {
    this.#REVISION = value;
  }

  private getEventHandlers(event: E): EventHandlerFunction<E>[] {
    const handlers: AggregateEventHandlers | undefined = Reflect.getMetadata(
      AGGREGATE_EVENT_HANDLERS,
      Reflect.getPrototypeOf(this)!,
    ) as AggregateEventHandlers | undefined;

    return (handlers?.get(event.constructor as unknown as Type<E>) ?? []).map(
      key => this[key] as unknown as EventHandlerFunction<E>,
    );
  }

  apply<T extends E = E>(event: T): void {
    this.#INTERNAL_EVENTS.push(event);
  }

  async callEventHandlers<T extends E = E>(event: T): Promise<void> {
    const handlers = this.getEventHandlers(event);
    const calls = handlers.map(async handler => {
      const response$ = handler.call(this, event);
      if (response$ instanceof Observable) {
        await lastValueFrom(response$);
      }
    });
    await Promise.all(calls);
  }

  async applyFromHistory<T extends E = E>(event: T): Promise<void> {
    await this.callEventHandlers(event);
    this.#VERSION += 1;
    this.#REVISION = event.revision!;
  }

  async commit(): Promise<void> {
    const events = this.getUncommittedEvents();
    this.#INTERNAL_EVENTS.length = 0;

    for (const event of events) {
      await this.callEventHandlers(event);
    }

    await this.publishAll(events);
  }

  getUncommittedEvents(): E[] {
    return [...this.#INTERNAL_EVENTS];
  }

  uncommit(): void {
    this.#INTERNAL_EVENTS.length = 0;
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
