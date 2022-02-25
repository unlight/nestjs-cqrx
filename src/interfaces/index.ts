export type { Type } from '@nestjs/common';
export type { PlainLiteralObject } from '@nestjs/common';
export type { RecordedEvent } from '@eventstore/db-client/dist/types/events';
export type { AppendToStreamOptions } from '@eventstore/db-client/dist/streams/appendToStream';
export { AggregateEventHandlers } from './aggregate-event-handlers';
export { AsyncAggregateRootFactory } from './async-aggregate-root-factory';
export { EventHandlerFunction } from './event-handler-function';
