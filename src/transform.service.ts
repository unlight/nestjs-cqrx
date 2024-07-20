import { Injectable, Type } from '@nestjs/common';
import { ModulesContainer } from '@nestjs/core';
import { InstanceWrapper } from '@nestjs/core/injector/instance-wrapper';
import { EVENTS_HANDLER_METADATA } from '@nestjs/cqrs/dist/decorators/constants';
import isClass from 'node-is-class';

import { EVENT_TRANSFORMERS } from './constants';
import { Event } from './event';
import { Nullable, RecordedEvent } from './interfaces';

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
    this.initialize(modules);
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

  private static *instanceWrapperIterator(
    modules: ModulesContainer,
  ): IterableIterator<InstanceWrapper> {
    for (const nestModule of modules.values()) {
      for (const instanceWrappers of nestModule.providers) {
        for (const instanceWrapper of instanceWrappers.values()) {
          if (
            instanceWrapper instanceof InstanceWrapper &&
            (instanceWrapper.metatype as Nullable<typeof instanceWrapper.metatype>)
          ) {
            yield instanceWrapper;
          }
        }
      }
    }
  }

  private initialize(modules: ModulesContainer) {
    for (const nestModule of modules.values()) {
      const transformers: Transformers =
        nestModule.getProviderByKey(EVENT_TRANSFORMERS)?.instance ?? [];

      for (const transformer of transformers) {
        const [key, transform] = TransformService.createTransform(transformer);
        this.transforms.set(key, transform);
      }
    }

    for (const instanceWrapper of TransformService.instanceWrapperIterator(modules)) {
      const events =
        (Reflect.getMetadata(
          EVENTS_HANDLER_METADATA,
          instanceWrapper.metatype,
        ) as Nullable<Type<Event>[]>) ?? [];

      for (const eventClass of events) {
        if (!this.transforms.has(eventClass.name)) {
          const [key, transform] = TransformService.createTransform(eventClass);
          this.transforms.set(key, transform);
        }
      }
    }
  }

  get(eventType: string): Transform | undefined {
    return this.transforms.get(eventType);
  }
}
