import { AGGREGATE_EVENT_HANDLERS } from './constants.js';
import type {
  AggregateEventHandlers,
  EventHandlerFunction,
  TEventData,
  Type,
} from './interfaces.ts';

type Keys = Array<string | symbol>;

export function EventHandler<E = any>(event: Type<E>) {
  return function eventHandlerDecorator(
    classPrototype: object,
    key: string | symbol,
    descriptor: TypedPropertyDescriptor<EventHandlerFunction<E>>,
  ): TypedPropertyDescriptor<EventHandlerFunction<E>> {
    const handlers = getEventHandlers(classPrototype);
    const value: Keys = handlers.get(event) ?? [];

    value.push(key);
    handlers.set(event, value);

    Reflect.defineMetadata(AGGREGATE_EVENT_HANDLERS, handlers, classPrototype);

    return descriptor;
  };
}

export function getEventHandlers(classPrototype: object) {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const handlers: AggregateEventHandlers =
    Reflect.getMetadata(AGGREGATE_EVENT_HANDLERS, classPrototype) ?? new Map();

  return handlers;
}
