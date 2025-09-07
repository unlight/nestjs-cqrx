import { FactoryProvider, ModuleMetadata, Type } from '@nestjs/common';
import { Observable } from 'rxjs';

import { AggregateRoot } from './aggregate-root';
import { Event } from './event';

export type RequiredEvent<P = unknown, M = unknown> = Required<Event<P, M>>;
export type AggregateEventHandlers = Map<Type<Event>, Array<string | symbol>>;

export interface AsyncAggregateRootFactory
  extends Pick<ModuleMetadata, 'imports'> {
  name: string;
  useFactory: (...args: unknown[]) => AggregateRoot | Promise<AggregateRoot>;
  inject?: FactoryProvider['inject'];
}

export type EventHandlerFunction<E extends Event = Event> =
  | ((event: E) => Observable<void> | Promise<void> | void)
  | (() => Observable<void> | Promise<void> | void);

export type { AppendToStreamOptions } from '@kurrent/kurrentdb-client/dist/streams/appendToStream';
export type { RecordedEvent } from '@kurrent/kurrentdb-client/dist/types/events';
export type { PlainLiteralObject, Type } from '@nestjs/common';
export type { Nullable } from 'simplytyped';

export type AppendResult = {
  /**
   * The current revision of the stream, to be passed as the `expectedRevision` in the next call.
   */
  nextExpectedRevision: bigint;
  commit?: bigint;
};

export { StreamNotFoundError } from '@kurrent/kurrentdb-client';
