export class Event<P = unknown> {
    readonly type: string = this.constructor.name;
    constructor(readonly data: P) {}
    // readonly eventId?: string,
    // readonly correlationId?: string,
    // readonly causationId?: string,
}
