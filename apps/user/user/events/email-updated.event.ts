import { Event } from 'cqrx';

export class EmailUpdated extends Event<string> {
  constructor(readonly data: string) {
    super();
  }
}
