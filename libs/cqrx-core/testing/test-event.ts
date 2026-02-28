import { Event } from '../src/event.ts';

export class TestEvent<D> extends Event<D> {
  constructor(readonly data: D) {
    super();
  }
}
