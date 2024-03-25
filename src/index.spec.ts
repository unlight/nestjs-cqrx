import { INestApplication } from '@nestjs/common';
import expect from 'expect';

import { Event, EventStoreService } from '.';

// eslint-disable-next-line unicorn/prevent-abbreviations
const eventstoreDbConnectionString =
  'esdb://localhost:2113?tls=false&keepAliveTimeout=120000&keepAliveInterval=120000';
let app: INestApplication;
let eventStoreService: EventStoreService;

describe('event', () => {
  it('type name', () => {
    class TestEvent extends Event {}

    const event = new TestEvent({});
    expect(event.type).toBe('TestEvent');
  });

  it('copy from other class', () => {
    class TestEvent {
      testId = '964';
    }
    const event = Event.from(new TestEvent());
    expect(event.type).toEqual('TestEvent');
    expect(event.data.testId).toBe('964');
  });
});
