import { IEvent } from '@nestjs/cqrs';
import { PlainLiteralObject, RecordedEvent } from './interfaces';

export class Event<P = unknown> implements IEvent {
    /**
     * The event stream that events belongs to.
     */
    readonly streamId?: string;
    /**
     * Unique identifier representing this event. UUID format.
     */
    readonly id?: string;
    /**
     * Number of this event in the stream.
     */
    readonly revision?: bigint;
    /**
     * Representing when this event was created in the database system.
     */
    readonly created?: number;
    /**
     * Is JSON or Binary data.
     */
    readonly isJson?: boolean;
    /**
     * Type of this event.
     */
    readonly type: string;
    /**
     * Data of this event.
     */
    readonly data: P;

    constructor(event: RecordedEvent);
    constructor(data: P);
    constructor();

    constructor(args?: any) {
        if (Event.isRecordedEvent(args)) {
            this.data = args.data as unknown as P;
            this.type = args.type;
            this.streamId = args.streamId;
            this.id = args.id;
            this.created = args.created;
            this.revision = args.revision;
            this.isJson = args.isJson;
        } else {
            this.data = args ?? {};
            this.type = this.constructor.name;
        }
    }

    static from<O extends PlainLiteralObject>(instance: O) {
        const event = new Event(instance);
        Reflect.set(event, 'type', instance.constructor.name);
        return event;
    }

    private static isRecordedEvent(event?: PlainLiteralObject): event is RecordedEvent {
        return Boolean(
            event &&
                event.streamId &&
                event.id &&
                event.type &&
                event.created &&
                typeof event.isJson === 'boolean',
        );
    }
}
