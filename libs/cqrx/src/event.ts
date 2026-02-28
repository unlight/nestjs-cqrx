/**
 * Abstract domain event
 */
export abstract class Event<D = any> {
  /**
   * The event stream that events belongs to
   */
  readonly stream: string = '';
  /**
   * Unique identifier representing this event
   */
  readonly id: string = '';
  /**
   * Number of this event in the stream
   */
  readonly version: bigint = -1n;
  /**
   * Representing when this event was created in the database system
   */
  readonly created?: Date;
  /**
   * Type of this event
   */
  readonly type: string = this.constructor.name;
  /**
   * Data (payload) of this event
   */
  readonly data!: D;
  /**
   * Representing the metadata associated with this event.
   */
  readonly metadata?: any;
}
