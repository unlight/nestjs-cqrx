import { Inject, Type } from '@nestjs/common';

import { AggregateRoot } from './aggregate-root';
import { StreamNotFound } from './drivers/errors';
import { EventStoreService } from './eventstore.service';

export function aggregateRepositoryToken(value: { readonly name: string }) {
    return value.name;
}

export const InjectAggregateRepository = (
    aggregate: Type<unknown>,
): ParameterDecorator => Inject(aggregateRepositoryToken(aggregate));

export type FindOneOptions = { rejectOnNotFound: boolean };

export class AggregateRepository<T extends AggregateRoot> {
    constructor(
        private readonly eventStore: EventStoreService,
        private readonly Aggregate: Type<T>,
        private readonly category: string,
    ) {}

    async findOne(id: string, options?: FindOneOptions): Promise<T> {
        const aggregate = new this.Aggregate(this.category, id);
        const { streamId } = aggregate;
        try {
            const streamEvents = this.eventStore.readFromStart(streamId);
            for await (const event of streamEvents) {
                await aggregate.apply(event, true);
            }
        } catch (error: unknown) {
            if (error instanceof StreamNotFound && options?.rejectOnNotFound) {
                throw error;
            }
        }

        return aggregate;
    }

    async save(aggregate: T): Promise<void> {
        await this.eventStore.appendToStream({
            streamId: aggregate.streamId,
            events: aggregate.getUncommittedEvents(),
        });
        await aggregate.commit();
    }
}
