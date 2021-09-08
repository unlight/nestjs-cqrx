import { Type } from '@nestjs/common';

import { AGGREGATE_ROOT_HANDLERS } from './constants';
import { Event } from './event';
import { HandlerFunction } from './interfaces';

export function EventHandler<E extends Event>(event: Type<E>) {
    return function eventHandlerDecorator(
        // eslint-disable-next-line @typescript-eslint/ban-types
        target: Object,
        key: string | symbol,
        descriptor: TypedPropertyDescriptor<HandlerFunction<E>>,
    ): TypedPropertyDescriptor<HandlerFunction<E>> {
        const handlers = Reflect.getMetadata(AGGREGATE_ROOT_HANDLERS, target) ?? [];
        Reflect.defineMetadata(
            AGGREGATE_ROOT_HANDLERS,
            [...handlers, { event, key }],
            target,
        );
        return descriptor;
    };
}
