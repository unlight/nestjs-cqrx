import { FactoryProvider, ModuleMetadata, Type } from '@nestjs/common';
import { Observable } from 'rxjs';
import type { Event, AggregateRoot, IStoredEvent } from 'cqrx-core';
import type { Nullable } from 'simplytyped';

import type { ClientOptions as EventdbxOptions } from 'eventdbx-cqrx';
import type { ClientOptions as KurrentdbOptions } from 'kurrentdb-cqrx';

export type RequiredEvent<P = unknown> = Required<IStoredEvent<P>>;
export type AggregateEventHandlers = Map<Type<Event>, Array<string | symbol>>;
export type Key = string | symbol;

export interface AsyncAggregateRootFactory extends Pick<
  ModuleMetadata,
  'imports'
> {
  name: string;
  useFactory: (...args: unknown[]) => AggregateRoot | Promise<AggregateRoot>;
  inject?: FactoryProvider['inject'];
}

export type EventHandlerFunction<E extends IStoredEvent = IStoredEvent> =
  | ((event: E) => Observable<void> | Promise<void> | void)
  | (() => Observable<void> | Promise<void> | void);

export type { Nullable, EventdbxOptions, KurrentdbOptions, Type };
