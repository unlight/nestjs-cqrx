import type { DbxClient, ClientOptions } from 'eventdbxjs';

export interface IEventResult {
  aggregateId: string;
  aggregateType: string;
  eventType: string;
  hash: string;
  merkleRoot: string;
  metadata: {
    createdAt: string;
    eventId: string;
    issuedBy: { group: string; user: string };
    [k: string]: any;
  };
  payload: { [k: string]: any };
  version: number;
}

export type { ClientOptions, DbxClient };
