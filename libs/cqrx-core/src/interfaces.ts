import type { Readable } from 'node:stream';
import type { Observable } from 'rxjs';

import type {
  Nullable,
  PlainObject,
  ConstructorFor as Constructor,
} from 'simplytyped';

export interface Type<T = any> extends Function {
  new (...args: any[]): T;
}

export type AggregateEventHandlers<E = any> = Map<
  Type<E>,
  Array<string | symbol>
>;

export type EventHandlerFunction<E = any> =
  | ((event: E) => Observable<void> | Promise<void> | void)
  | (() => Observable<void> | Promise<void> | void);

export interface IStoredEvent<D = any> {
  /**
   * The event stream that events belongs to
   */
  readonly stream: string;
  /**
   * Unique identifier representing this event
   */
  readonly id: string;
  /**
   * Number of this event in the stream
   */
  readonly version: bigint;
  /**
   * Representing when this event was created in the database system
   */
  readonly created: Date;
  /**
   * Type of this event
   */
  readonly type: string;
  /**
   * Data (payload) of this event
   */
  readonly data: D;
  /**
   * Representing the metadata associated with this event.
   */
  readonly metadata?: unknown;
}

export type { Nullable, PlainObject, Constructor };

export interface ReadableSubscription extends Readable {
  unsubscribe(): Promise<void>;
}
