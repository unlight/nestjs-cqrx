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
import { EventStoreService } from './eventstore.service';
import { TransformService } from './transform.service';
import { EventStoreDBClient } from '@eventstore/db-client';
import { EventPublisher } from './event-publisher';

const defaultCqrxOptions = {
    eventstoreDbConnectionString: undefined as string | undefined,
};

export type CqrxModuleOptions = typeof defaultCqrxOptions;

interface CqrxOptionsFactory {
    createCqrxOptions(): Partial<CqrxModuleOptions>;
}

export interface CqrxModuleAsyncOptions extends Pick<ModuleMetadata, 'imports'> {
    useClass?: Type<CqrxOptionsFactory>;
    useExisting?: Type<CqrxOptionsFactory>;
    useFactory?: (
        ...args: any[]
    ) => Promise<Partial<CqrxModuleOptions>> | Partial<CqrxModuleOptions>;
    inject?: FactoryProvider['inject'];
}

@Module({
    imports: [CqrsModule],
    providers: [EventStoreService, EventPublisher, TransformService],
    exports: [CqrsModule, EventStoreService, EventPublisher],
})
export class CqrxCoreModule implements OnModuleInit {
    private subscription?: () => Promise<void>;

    constructor(
        private readonly eventBus$: EventBus<Event>,
        private readonly eventStoreService: EventStoreService,
    ) {}

    static forRoot(options: Partial<CqrxModuleOptions>): DynamicModule {
        return {
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
            exports: [EventStoreService],
        };
    }

    static forRootAsync(options: CqrxModuleAsyncOptions): DynamicModule {
        return {
            global: true,
            module: CqrxCoreModule,
            imports: [...(options.imports || [])],
            providers: [
                TransformService,
                this.createEventStoreServiceProvider(),
                ...this.createAsyncProviders(options),
            ],
            exports: [EventStoreService],
        };
    }

    private static createAsyncProviders(options: CqrxModuleAsyncOptions): Provider[] {
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
            provide: EventStoreService,
            useFactory: (
                options: CqrxModuleOptions,
                transformers: TransformService,
            ) => {
                if (!options.eventstoreDbConnectionString) {
                    throw new Error(
                        'Cannot create eventstore client, check module options.',
                    );
                }
                const client = EventStoreDBClient.connectionString(
                    options.eventstoreDbConnectionString,
                );
                return new EventStoreService(client, transformers);
            },
            inject: [CQRX_OPTIONS, TransformService],
        };
    }

    private static createAsyncOptionsProvider(
        options: CqrxModuleAsyncOptions,
    ): Provider {
        if (options.useFactory) {
            return {
                provide: CQRX_OPTIONS,
                useFactory: options.useFactory,
                inject: options.inject || [],
            };
        }

        return {
            provide: CQRX_OPTIONS,
            useFactory: (factory: CqrxOptionsFactory) => factory.createCqrxOptions(),
            inject: [
                (options.useClass || options.useExisting) as Type<CqrxOptionsFactory>,
            ],
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
