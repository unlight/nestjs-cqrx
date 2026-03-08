import { Event } from '../src/event.ts';

export class TestEvent<D> extends Event<D> {
  readonly type = 'test_event'; // TODO: Validate somehow
  constructor(readonly data: D) {
    super();
  }
}
