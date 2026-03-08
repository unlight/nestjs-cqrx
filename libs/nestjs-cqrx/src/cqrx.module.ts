import { DynamicModule, Module, Provider, Type } from '@nestjs/common';

import { EVENT_TRANSFORMERS } from './constants.js';
import {
  CqrxCoreModule,
  CqrxModuleAsyncOptions,
  CqrxModuleOptions,
} from './cqrx-core.module.js';
import { AsyncAggregateRootFactory } from './interfaces.js';
import {
  EventStoreService,
  getEventHandlers,
  AggregateRoot,
  Transformers,
  AggregateRepository,
} from 'cqrx-core';
import { aggregateRepositoryToken } from './providers.js';

@Module({})
export class CqrxModule {
  static forRoot(options: Partial<CqrxModuleOptions>): DynamicModule {
    return {
      imports: [CqrxCoreModule.forRoot(options)],
      module: CqrxModule,
    };
  }

  static forRootAsync(options: CqrxModuleAsyncOptions): DynamicModule {
    return {
      imports: [CqrxCoreModule.forRootAsync(options)],
      module: CqrxModule,
    };
  }

  static forFeature(
    aggregateRoots: Type<AggregateRoot>[],
    classTransformers: Transformers = [], // Transforms stream event to domain event
  ): DynamicModule {
    const aggregateRepoProviders =
      this.createAggregateRepositoryProviders(aggregateRoots);
    // Auto create transformers from event handler decorator
    const autoTransformers = aggregateRoots

      .map(klass => getEventHandlers(klass.prototype))
      .flatMap(events => [...events.keys()]);
    const transformers = new Set([...autoTransformers, ...classTransformers]);
    const transformersProvider = {
      provide: EVENT_TRANSFORMERS,
      useValue: [...transformers],
    } as const;

    return {
      exports: [transformersProvider, ...aggregateRepoProviders],
      imports: [],
      module: CqrxModule,
      providers: [transformersProvider, ...aggregateRepoProviders],
    };
  }

  private static createAggregateRepositoryProviders(
    aggregateRoots: Array<Type<AggregateRoot>>,
  ): Provider[] {
    return aggregateRoots.map(aggregateRoot => ({
      inject: [EventStoreService],
      provide: aggregateRepositoryToken(aggregateRoot),
      useFactory: (eventStoreService: EventStoreService) =>
        new AggregateRepository(eventStoreService, aggregateRoot),
    }));
  }

  private static createAsyncAggregateRepositoryProviders(
    factories: AsyncAggregateRootFactory[] = [],
  ): Provider[] {
    return factories.map(factory => {
      return {
        inject: [...(factory.inject ?? [])],
        provide: aggregateRepositoryToken(factory),
        useFactory: (...args: unknown[]) => factory.useFactory(...args),
      };
    });
  }

  static forFeatureAsync(
    factories: AsyncAggregateRootFactory[] = [],
  ): DynamicModule {
    const providers = this.createAsyncAggregateRepositoryProviders(factories);
    const imports = factories.flatMap(factory => factory.imports || []);

    return {
      exports: providers,
      imports: [...imports],
      module: CqrxModule,
      providers: providers,
    };
  }
}
