import type { IStoredEvent, ReadableSubscription } from './interfaces.ts';

export type IApplyArgs = {
  aggregateType: string;
  aggregateId: string;
  eventType: string;
  eventData: any;
  metadata?: any;
};
export type ICreateArgs = IApplyArgs;

export type IGetEventArgs = {
  aggregateType: string;
  aggregateId: string;
};

export type IApplyResult = {
  version: bigint;
};

export type ICreateResult = {
  version: bigint;
};

export interface IEventStoreClient {
  create(args: ICreateArgs): Promise<ICreateResult>;
  apply(args: IApplyArgs): Promise<IApplyResult>;
  read(args: IGetEventArgs): AsyncIterableIterator<IStoredEvent>;
  disconnect(): Promise<void>;
  subscribeToAll(
    eventListener: (event: IStoredEvent) => void,
    errorListener: (error: Error) => void,
  ): ReadableSubscription;
}
