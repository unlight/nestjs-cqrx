import expect from 'expect';
import { Event } from './index';

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

  it('isRecordedEvent', () => {
    const isEvent = Event.isRecordedEvent({
      streamId: 'cat_cmf9plqy90001c8tt3tl61kgx',
      id: '169ab4af-2fe0-4222-8dbf-4044c53f58f4',
      revision: 0,
      type: 'CatFeedEvent',
      data: {},
      metadata: undefined,
      isJson: true,
      created: new Date('2025-09-07'),
      position: { commit: 77735n, prepare: 77735n },
    });
    expect(isEvent).toBe(true);
  });
});
