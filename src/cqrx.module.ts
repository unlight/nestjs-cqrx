import { DynamicModule, Module, Provider, Type } from '@nestjs/common';

import { AggregateRepository, aggregateRepositoryToken } from './aggregate.repository';
import { AggregateRoot } from './aggregate-root';
import { EVENT_TRANSFORMERS } from './constants';
import {
  CqrxCoreModule,
  CqrxModuleAsyncOptions,
  CqrxModuleOptions,
} from './cqrx-core.module';
import { EventStoreService } from './eventstore.service';
import { AsyncAggregateRootFactory } from './interfaces';
import { Transformers } from './transform.service';
import { getEventHandlers } from './event-handler.decorator';

@Module({})
export class CqrxModule {
  static forRoot(options: Partial<CqrxModuleOptions>): DynamicModule {
    return {
      module: CqrxModule,
      imports: [CqrxCoreModule.forRoot(options)],
    };
  }

  static forRootAsync(options: CqrxModuleAsyncOptions): DynamicModule {
    return {
      module: CqrxModule,
      imports: [CqrxCoreModule.forRootAsync(options)],
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
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      .map(klass => getEventHandlers(klass.prototype))
      .flatMap(events => [...events.keys()]);
    const transformers = new Set([...autoTransformers, ...classTransformers]);

    const transformersProvider = {
      provide: EVENT_TRANSFORMERS,
      useValue: [...transformers],
    } as const;

    return {
      module: CqrxModule,
      imports: [],
      providers: [transformersProvider, ...aggregateRepoProviders],
      exports: [transformersProvider, ...aggregateRepoProviders],
    };
  }

  private static createAggregateRepositoryProviders(
    aggregateRoots: Array<Type<AggregateRoot>>,
  ): Provider[] {
    return aggregateRoots.map(aggregateRoot => ({
      provide: aggregateRepositoryToken(aggregateRoot),
      useFactory: (eventStoreService: EventStoreService) =>
        new AggregateRepository(eventStoreService, aggregateRoot, aggregateRoot.name),
      inject: [EventStoreService],
    }));
  }

  private static createAsyncAggregateRepositoryProviders(
    factories: AsyncAggregateRootFactory[] = [],
  ): Provider[] {
    return factories.map(factory => {
      return {
        provide: aggregateRepositoryToken(factory),
        inject: [...(factory.inject || [])],
        useFactory: (...args: unknown[]) => factory.useFactory(...args),
      };
    });
  }

  static forFeatureAsync(factories: AsyncAggregateRootFactory[] = []): DynamicModule {
    const providers = this.createAsyncAggregateRepositoryProviders(factories);
    const imports = factories.flatMap(factory => factory.imports || []);

    return {
      module: CqrxModule,
      imports: [...imports],
      providers: providers,
      exports: providers,
    };
  }
}
