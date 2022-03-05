import { Type, FactoryProvider, ModuleMetadata } from '@nestjs/common';
import { Observable } from 'rxjs';
import { Event } from './event';
import { AggregateRoot } from './aggregate-root';

export type RequiredEvent<P = unknown, M = unknown> = Required<Event<P, M>>;
export type AggregateEventHandlers = Map<Type<Event>, Array<string | symbol>>;

export interface AsyncAggregateRootFactory extends Pick<ModuleMetadata, 'imports'> {
    name: string;
    useFactory: (...args: unknown[]) => AggregateRoot | Promise<AggregateRoot>;
    inject?: FactoryProvider['inject'];
}

export type EventHandlerFunction<E extends Event = Event> = (
    event: E,
) => Observable<void> | Promise<void> | void;

export type { PlainLiteralObject, Type } from '@nestjs/common';
export type { AppendToStreamOptions } from '@eventstore/db-client/dist/streams/appendToStream';
export type { RecordedEvent } from '@eventstore/db-client/dist/types/events';
