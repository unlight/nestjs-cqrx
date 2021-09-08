import {
    DynamicModule,
    Module,
    ModuleMetadata,
    OnModuleInit,
    Provider,
    Type,
} from '@nestjs/common';
import { CqrsModule, EventBus } from '@nestjs/cqrs';
import assert from 'assert';

import { CQRX_OPTIONS, EVENTSTORE } from './constants';
import { Event } from './event';
import { EventStoreService } from './eventstore.service';
import { TransformerService } from './transformer.service';

const defaultCqrxOptions = {
    eventstoreDbConnectionString: undefined as string | undefined,
    inMemory: false,
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
    inject?: any[];
}

@Module({
    imports: [CqrsModule],
    providers: [EventStoreService, TransformerService],
    exports: [CqrsModule, EventStoreService],
})
export class CqrxCoreModule implements OnModuleInit {
    private subscription?: () => Promise<void>;

    constructor(
        private readonly eventBus$: EventBus<Event>,
        private readonly eventStore: EventStoreService,
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
                this.createEventStoreProvider(),
                EventStoreService,
                TransformerService,
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
                EventStoreService,
                TransformerService,
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

    private static createEventStoreProvider() {
        return {
            provide: EVENTSTORE,
            useFactory: async (options: CqrxModuleOptions) => {
                if (options.inMemory)
                    return import('./drivers/memory').then(
                        ({ Memory }) => new Memory(),
                    );
                if (options.eventstoreDbConnectionString) {
                    return import('./drivers/eventstore').then(
                        ({ EventStore }) =>
                            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                            new EventStore(options.eventstoreDbConnectionString!),
                    );
                }
                throw new Error(
                    'Cannot create eventstore client, check module options.',
                );
            },
            inject: [CQRX_OPTIONS],
        };
    }

    onModuleInit() {
        this.subscription = this.eventStore.subscribeToAll(event => {
            this.eventBus$.subject$.next(event);
        });
    }

    async onModuleDestroy() {
        await this.subscription?.();
    }
}
