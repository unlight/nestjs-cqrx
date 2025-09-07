import { AGGREGATE_EVENT_HANDLERS } from './constants';
import { Event } from './event';
import {
  AggregateEventHandlers,
  EventHandlerFunction,
  Type,
} from './interfaces';

type Keys = Array<string | symbol>;

export function EventHandler<E extends Event>(event: Type<E>) {
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
  const handlers: AggregateEventHandlers =
    Reflect.getMetadata(AGGREGATE_EVENT_HANDLERS, classPrototype) ??
    new Map<Type<Event>, Keys>();

  return handlers;
}
