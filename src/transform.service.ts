import { Injectable, Type } from '@nestjs/common';
import { ModulesContainer } from '@nestjs/core';
import isClass from 'node-is-class';

import { EVENT_TRANSFORMERS } from './constants';
import { Event } from './event';
import { RecordedEvent } from './interfaces';

export type Transform = (event: RecordedEvent) => Event;
export type Transformer = Type<Event> | [string, Transform];
export type Transformers = Array<Transformer>;

/**
 * Transform stream event to domain event.
 */
@Injectable()
export class TransformService {
    private readonly transforms = new Map<string | symbol, Transform>();

    constructor(modules: ModulesContainer) {
        for (const moduleValue of modules.values()) {
            const transformers: Transformers =
                // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
                moduleValue.getProviderByKey(EVENT_TRANSFORMERS)?.instance ?? [];

            for (const transformer of transformers) {
                const [key, transform] = TransformService.createTransform(transformer);
                this.transforms.set(key, transform);
            }
        }
    }

    private static createTransform(
        transformer: Transformer,
    ): [string | symbol, Transform] {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        if (isClass(transformer)) {
            return [
                (transformer as Type<Event>).name,
                event => new (transformer as Type<Event>)(event),
            ];
        }
        if (
            transformer.length === 2 &&
            ['string', 'symbol'].includes(typeof transformer[0]) &&
            typeof transformer[1] === 'function'
        ) {
            return transformer as [string | symbol, Transform];
        }
        throw new TypeError('Cannot create transform');
    }

    get(eventType: string): Transform | undefined {
        return this.transforms.get(eventType);
    }
}
