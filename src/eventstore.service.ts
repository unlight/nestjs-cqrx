import { Inject, Injectable } from '@nestjs/common';

import { EVENTSTORE } from './constants';
import { AppendResult, AppendStreamOptions, IStore } from './drivers/store.interface';
import { Event } from './event';
import { TransformerService } from './transformer.service';

@Injectable()
export class EventStoreService {
    constructor(
        @Inject(EVENTSTORE) private readonly client: IStore,
        private readonly transformers: TransformerService,
    ) {}

    appendToStream(options: AppendStreamOptions): Promise<AppendResult> {
        return this.client.appendToStream(options);
    }

    async *readFromStart(stream: string): AsyncGenerator<Event, void> {
        const streamEvents = this.client.readFromStart(stream);
        for await (const streamEvent of streamEvents) {
            const transform = this.transformers.get(streamEvent.type);
            const event = transform?.(streamEvent) ?? streamEvent;
            yield event;
        }
    }

    subscribeToAll(listener: (event) => void) {
        return this.client.subscribeToAll(streamEvent => {
            const transform = this.transformers.get(streamEvent.type);
            const event = transform?.(streamEvent) ?? streamEvent;
            listener(event);
        });
    }
}
