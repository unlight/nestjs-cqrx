import { Event } from '../event';
import { ExpectedRevision } from '../interfaces/expected-revision';

export type AppendStreamOptions = {
    streamId: string;
    expectedRevision?: ExpectedRevision;
} & (
    | {
          event: Event;
          events?: Event[];
      }
    | {
          event?: Event;
          events: Event[];
      }
);

export type AppendResult = {
    /**
     * The current revision of the stream, to be passed as the `expectedRevision` in the next call.
     */
    expectedRevision: bigint;
};

export interface IStore {
    readFromStart(streamId: string): AsyncGenerator<Event, void>;
    appendToStream(options: AppendStreamOptions): Promise<AppendResult>;
    subscribeToStream(streamId: string, listener: (event) => void): () => Promise<void>;
    subscribeToAll(listener: (event) => void): () => Promise<void>;
}
