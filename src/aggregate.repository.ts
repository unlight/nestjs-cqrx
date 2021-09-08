import { Inject, Type } from '@nestjs/common';

import { AggregateRoot } from './aggregate-root';
import { EventStoreService } from './eventstore.service';

export function aggregateRepositoryToken(value: { readonly name: string }) {
    return value.name;
}

export const InjectAggregateRepository = (
    aggregate: Type<unknown>,
): ParameterDecorator => Inject(aggregateRepositoryToken(aggregate));

export class AggregateRepository<T extends AggregateRoot> {
    constructor(
        private readonly eventStore: EventStoreService,
        private readonly Aggregate: Type<T>,
        private readonly category: string,
    ) {}

    async findOne(id: string): Promise<T> {
        const aggregate = new this.Aggregate(this.category, id);
        const { streamId } = aggregate;

        for await (const event of this.eventStore.readFromStart(streamId)) {
            await aggregate.apply(event, true);
        }

        return aggregate;
    }

    async save(aggregate: T): Promise<void> {
        await this.eventStore.save({
            streamId: aggregate.streamId,
            events: aggregate.getUncommittedEvents(),
        });
        await aggregate.commit();
    }
}
