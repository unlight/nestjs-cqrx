import { KurrentDBClient } from '@kurrent/kurrentdb-client';
import {
  DynamicModule,
  FactoryProvider,
  Module,
  ModuleMetadata,
  OnModuleInit,
  Provider,
  Type,
} from '@nestjs/common';
import { CqrsModule, EventBus } from '@nestjs/cqrs';
import assert from 'assert';

import { CQRX_OPTIONS } from './constants';
import { Event } from './event';
import { EventPublisher } from './event-publisher';
import { EventStoreService } from './eventstore.service';
import { TransformService } from './transform.service';

const defaultCqrxOptions = {
  eventstoreConnectionString: undefined as string | undefined,
};

export type CqrxModuleOptions = typeof defaultCqrxOptions;

interface CqrxOptionsFactory {
  createCqrxOptions(): Partial<CqrxModuleOptions>;
}

export interface CqrxModuleAsyncOptions
  extends Pick<ModuleMetadata, 'imports'> {
  useClass?: Type<CqrxOptionsFactory>;
  useExisting?: Type<CqrxOptionsFactory>;
  useFactory?: (
    ...args: any[]
  ) => Promise<Partial<CqrxModuleOptions>> | Partial<CqrxModuleOptions>;
  inject?: FactoryProvider['inject'];
}

@Module({
  exports: [CqrsModule, EventStoreService, EventPublisher],
  imports: [CqrsModule],
  providers: [EventStoreService, EventPublisher, TransformService],
})
export class CqrxCoreModule implements OnModuleInit {
  private subscription?: () => Promise<void>;

  constructor(
    private readonly eventBus$: EventBus<Event>,
    private readonly eventStoreService: EventStoreService,
  ) {}

  static forRoot(options: Partial<CqrxModuleOptions>): DynamicModule {
    return {
      exports: [EventStoreService],
      global: true,
      imports: [],
      module: CqrxCoreModule,
      providers: [
        {
          provide: CQRX_OPTIONS,
          useValue: { ...defaultCqrxOptions, ...options },
        },
        this.createEventStoreServiceProvider(),
        TransformService,
      ],
    };
  }

  static forRootAsync(options: CqrxModuleAsyncOptions): DynamicModule {
    return {
      exports: [EventStoreService],
      global: true,
      imports: [...(options.imports || [])],
      module: CqrxCoreModule,
      providers: [
        TransformService,
        this.createEventStoreServiceProvider(),
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
      {
        provide: options.useClass,
        useClass: options.useClass,
      },
    ];
  }

  private static createEventStoreServiceProvider() {
    return {
      inject: [CQRX_OPTIONS, TransformService],
      provide: EventStoreService,
      useFactory: (
        options: CqrxModuleOptions,
        transformers: TransformService,
      ) => {
        if (!options.eventstoreConnectionString) {
          throw new Error(
            'Cannot create eventstore client, check module options.',
          );
        }
        const client = KurrentDBClient.connectionString(
          options.eventstoreConnectionString,
        );
        return new EventStoreService(client, transformers);
      },
    };
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

  onModuleInit() {
    this.subscription = this.eventStoreService.subscribeToAll(event => {
      this.eventBus$.subject$.next(event);
    });
  }

  async onModuleDestroy() {
    await this.subscription?.();
  }
}
