import { Injectable } from '@nestjs/common';
import { ModulesContainer } from '@nestjs/core';

import { EVENT_TRANSFORMERS } from './constants';
import { Event } from './event';

export type Transformer<T = unknown> = (event: T) => Event;

/**
 * Transform stream event to domain event.
 */
@Injectable()
export class TransformerService {
    private readonly transformers = new Map<string, Transformer>();
    constructor(modules: ModulesContainer) {
        for (const module of modules.values()) {
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
            const transformers = module.getProviderByKey(EVENT_TRANSFORMERS)?.instance;
            if (transformers) {
                for (const [key, transformer] of Object.entries<Transformer>(
                    transformers,
                )) {
                    this.transformers.set(key, transformer);
                }
            }
        }
    }

    get(eventType: string): Transformer | undefined {
        return this.transformers.get(eventType);
    }
}
