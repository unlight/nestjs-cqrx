import {
  DynamicModule,
  FactoryProvider,
  Module,
  ModuleMetadata,
  Provider,
  Type,
} from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import assert from 'node:assert';

import { CQRX_OPTIONS } from './constants.js';

import { ModulesContainer } from '@nestjs/core';
import {
  EventstoreClient,
  EventStoreService,
  IEventStoreClient,
  TransformService,
} from 'cqrx-core';
import type { EventdbxOptions, KurrentdbOptions } from './interfaces.ts';
import {
  eventStoreClientFactory,
  transformServiceFactory,
} from './providers.js';

export type CqrxModuleOptions =
  | ({ type: 'eventdbx' } & EventdbxOptions)
  | ({ type: 'kurrentdb' } & KurrentdbOptions);

interface CqrxOptionsFactory {
  createCqrxOptions(): Partial<CqrxModuleOptions>;
}

export interface CqrxModuleAsyncOptions extends Pick<
  ModuleMetadata,
  'imports'
> {
  useClass?: Type<CqrxOptionsFactory>;
  useExisting?: Type<CqrxOptionsFactory>;
  useFactory?: (
    ...args: any[]
  ) => Promise<Partial<CqrxModuleOptions>> | Partial<CqrxModuleOptions>;
  inject?: FactoryProvider['inject'];
}

@Module({
  exports: [CqrsModule, EventStoreService], // EventPublisher
  imports: [CqrsModule],
  providers: [EventStoreService, TransformService], // EventPublisher
})
export class CqrxCoreModule {
  static forRoot(options: Partial<CqrxModuleOptions>): DynamicModule {
    return {
      global: true,
      exports: [EventStoreService],
      imports: [],
      module: CqrxCoreModule,
      providers: [
        { provide: CQRX_OPTIONS, useValue: options },
        ...this.createProviders(),
      ],
    };
  }

  static forRootAsync(options: CqrxModuleAsyncOptions): DynamicModule {
    return {
      global: true,
      exports: [EventStoreService],
      imports: [...(options.imports || [])],
      module: CqrxCoreModule,
      providers: [
        ...this.createProviders(),
        ...this.createAsyncProviders(options),
      ],
    };
  }

  private static createAsyncProviders(
    options: CqrxModuleAsyncOptions,
  ): Provider[] {
    if (options.useFactory || options.useExisting) {
      return [this.createAsyncOptionsProvider(options)];
    }

    assert(
      options.useClass,
      'useClass, useFactory or useExisting must be provided',
    );

    return [
      this.createAsyncOptionsProvider(options),
      { provide: options.useClass, useClass: options.useClass },
    ];
  }

  private static createProviders() {
    return [
      {
        provide: TransformService,
        inject: [ModulesContainer],
        useFactory: (modules: ModulesContainer) =>
          transformServiceFactory(modules),
      },
      {
        provide: EventstoreClient,
        inject: [CQRX_OPTIONS],
        useFactory: (options: CqrxModuleOptions) =>
          eventStoreClientFactory(options),
      },
      {
        provide: EventStoreService,
        inject: [EventstoreClient, TransformService],
        useFactory: (...args: [IEventStoreClient, TransformService]) =>
          new EventStoreService(...args),
      },
    ];
  }

  private static createAsyncOptionsProvider(
    options: CqrxModuleAsyncOptions,
  ): Provider {
    if (options.useFactory) {
      return {
        inject: options.inject || [],
        provide: CQRX_OPTIONS,
        useFactory: options.useFactory,
      };
    }

    return {
      inject: [
        (options.useClass || options.useExisting) as Type<CqrxOptionsFactory>,
      ],
      provide: CQRX_OPTIONS,
      useFactory: (factory: CqrxOptionsFactory) => factory.createCqrxOptions(),
    };
  }
}
