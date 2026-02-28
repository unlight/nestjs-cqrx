import type { IStoredEvent, Type } from './interfaces.ts';
import type { Event } from './event.ts';

export function streamToAggregate(stream: string) {
  const index = stream.lastIndexOf('_');

  const aggregateId = stream.slice(index + 1);
  const aggregateType = stream.slice(0, index);

  return { aggregateId, aggregateType };
}

// async streamIdAndAggregate(argument: T): Promise<[string, T]>;
// async streamIdAndAggregate(argument: string): Promise<[string, T]>;
// async streamIdAndAggregate(argument: string | T): Promise<[string, T]>;
// /**
//  * Return stream id (uid) and aggregate
//  */
// async streamIdAndAggregate(argument: unknown): Promise<[string, T]> {
//   if (typeof argument === 'string') {
//     const aggregate = await this.load(argument);
//     return [argument, aggregate];
//   } else if (argument instanceof AggregateRoot) {
//     return [argument.aggregateId, argument as T];
//   }
//   throw new TypeError('Invalid argument, expected string or aggregate');
// }

/**
 * Create domain event from stored event
 */
export function createFromStoredEvent<C = Event>(
  ctor: Type<C>,
  storedEvent: IStoredEvent,
): C {
  const domainEvent = Reflect.construct(ctor, []);

  // @ts-expect-error Fix type error
  Object.assign(domainEvent, storedEvent);

  return domainEvent;
}
