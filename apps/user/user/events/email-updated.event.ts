import { Event } from 'cqrx-core';

export class EmailUpdated extends Event<string> {
  constructor(readonly data: string) {
    super();
  }
}
