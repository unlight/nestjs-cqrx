import { Inject } from '@nestjs/common';
import { ModulesContainer } from '@nestjs/core';
import { InstanceWrapper } from '@nestjs/core/injector/instance-wrapper.js';
import { EVENTS_HANDLER_METADATA } from '@nestjs/cqrs/dist/decorators/constants.js';
import {
  IStoredEvent,
  Transform,
  Transformers,
  TransformService,
} from 'cqrx-core';
import type { EventdbxEventstoreClient } from 'eventdbx-cqrx';
import type { KurrentdbEventStoreClient } from 'kurrentdb-cqrx';

import { EVENT_TRANSFORMERS } from './constants.js';
import type { CqrxModuleOptions } from './cqrx-core.module.js';
import type { Key, Nullable, Type } from './interfaces.js';

export function aggregateRepositoryToken(value: { readonly name: string }) {
  return `AggregateRepository${value.name}`;
}

export const InjectAggregateRepository = (
  aggregate: Type<unknown>,
): ParameterDecorator => Inject(aggregateRepositoryToken(aggregate));

export async function eventStoreClientFactory(
  options: CqrxModuleOptions,
): Promise<EventdbxEventstoreClient | KurrentdbEventStoreClient> {
  const { type } = options;
  switch (type) {
    case 'eventdbx': {
      const { createEventdbxEventstoreClient } = await import('eventdbx-cqrx');

      return createEventdbxEventstoreClient(options);
    }
    case 'kurrentdb': {
      const { createKurrentdbEventstoreClient } =
        await import('kurrentdb-cqrx');

      return createKurrentdbEventstoreClient(options);
    }
  }

  throw new TypeError(`Unknown client type ${type}`);
}

function* instanceWrapperIterator(
  modules: ModulesContainer,
): IterableIterator<InstanceWrapper> {
  for (const nestModule of modules.values()) {
    for (const instanceWrappers of nestModule.providers) {
      for (const instanceWrapper of instanceWrappers.values()) {
        if (
          instanceWrapper instanceof InstanceWrapper &&
          (instanceWrapper.metatype as Nullable<
            typeof instanceWrapper.metatype
          >)
        ) {
          yield instanceWrapper;
        }
      }
    }
  }
}

export function transformServiceFactory(
  modules: ModulesContainer,
): TransformService {
  const transforms: Map<Key, Transform> = new Map();

  for (const nestModule of modules.values()) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const transformers: Transformers =
      nestModule.getProviderByKey(EVENT_TRANSFORMERS)?.instance ?? [];

    for (const transformer of transformers) {
      const [key, transform] = TransformService.createTransform(transformer);
      transforms.set(key, transform);
    }
  }

  for (const instanceWrapper of instanceWrapperIterator(modules)) {
    if (!instanceWrapper.metatype) continue;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const events: Type<IStoredEvent>[] =
      Reflect.getMetadata(EVENTS_HANDLER_METADATA, instanceWrapper.metatype) ??
      [];
    for (const eventClass of events) {
      if (!transforms.has(eventClass.name)) {
        const [key, transform] = TransformService.createTransform(eventClass);
        transforms.set(key, transform);
      }
    }
  }

  return new TransformService(transforms);
}
