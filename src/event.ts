export class Event<P = unknown> {
    /**
     * The event stream that events belongs to.
     */
    readonly streamId!: string;
    /**
     * Unique identifier representing this event. UUID format.
     */
    readonly id!: string;
    /**
     * Number of this event in the stream.
     */
    readonly revision!: bigint;
    /**
     * Representing when this event was created in the database system.
     */
    readonly created!: number;

    /**
     * Type of this event.
     */
    readonly type: string;

    /**
     * Data of this event.
     */
    readonly data: P;

    constructor(data: P) {
        this.data = data;
        this.type = this.constructor.name;
    }
}
