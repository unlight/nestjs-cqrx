import { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import all from 'it-all';
import { last } from 'lodash';
import { lastValueFrom } from 'rxjs';
import { AggregateRoot } from './aggregate-root';
import { CqrxCoreModule } from './cqrx-core.module';
import { CqrxModule } from './cqrx.module';
import { Event } from './event';
import { EventStoreService } from './eventstore.service';

import cuid from 'cuid';
import expect from 'expect';

import { EventBus } from '@nestjs/cqrs';
import { filter, take } from 'rxjs/operators';
import { EventStoreDBClient } from '@eventstore/db-client';

const eventstoreDbConnectionString =
  'esdb://localhost:2113?tls=false&keepAliveTimeout=120000&keepAliveInterval=120000';

describe('eventstore', () => {
  // eslint-disable-next-line unicorn/prevent-abbreviations
  let app: INestApplication;
  let eventStoreService: EventStoreService;

  beforeAll(async () => {
    app = await NestFactory.create(
      {
        module: CqrxModule,
        imports: [
          CqrxCoreModule.forRoot({ eventstoreDbConnectionString }),
          CqrxModule.forFeature([], [Event]),
        ],
        providers: [],
      },
      {
        logger: false,
      },
    );
    await app.init();
    eventStoreService = app.get(EventStoreService);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('aggregate root', () => {
    class UserAggregateRoot extends AggregateRoot {}
    let aggregate: UserAggregateRoot;

    beforeEach(() => {
      aggregate = new UserAggregateRoot('user', '532');
    });

    it('aggregate root smoke', () => {
      expect(aggregate).toBeTruthy();
    });
  });

  describe('append to stream', () => {
    it('append to stream', async () => {
      const userRegisteredDto = { id: '392', name: 'ivan' };
      const userRegisteredEvent = new Event<typeof userRegisteredDto>(
        userRegisteredDto,
      );
      await eventStoreService.appendToStream('user_392', userRegisteredEvent);

      const events = await all(eventStoreService.readFromStart('user_392'));
      expect(last(events)?.data).toEqual({ id: '392', name: 'ivan' });
    });

    it('check event metadata', async () => {
      const userRegisteredDto = { id: '555', name: 'ivan' };
      const userRegisteredEvent = new Event<typeof userRegisteredDto>(
        userRegisteredDto,
      );
      await eventStoreService.appendToStream('user_555', userRegisteredEvent);

      const events = await all(eventStoreService.readFromStart('user_555'));
      const event = last(events);

      expect(event?.type).toEqual('Event');
      expect(event?.streamId).toEqual('user_555');
      expect(typeof event?.id).toBe('string');
      expect(event?.revision).toBeGreaterThanOrEqual(0n);
      expect(event?.created).toBeInstanceOf(Date);
    });
  });

  describe('append stream nostream', () => {
    it('nostream ok', async () => {
      const streamId = `user_${Math.random().toString(36).slice(2)}`;
      const result = await eventStoreService.appendToStream(
        streamId,
        new Event({ id: '1' }),
        { expectedRevision: 'no_stream' },
      );

      expect(result).toBeTruthy();
    });

    it('nostream error', async () => {
      const streamId = 'user_123456789';
      await eventStoreService.appendToStream(streamId, new Event({ id: 'X' }));

      await expect(async () => {
        await eventStoreService.appendToStream(streamId, new Event({ id: 'XX' }), {
          expectedRevision: 'no_stream',
        });
      }).rejects.toThrow();
    });
  });

  describe('append stream exists', () => {
    it('exists error', async () => {
      await expect(
        all(eventStoreService.readFromStart('user_s4l1jxeB3Pfl2ff3')),
      ).rejects.toThrow(/user_s4l1jxeB3Pfl2ff3 not found/);
      await expect(async () => {
        await eventStoreService.appendToStream('user_s4l1jxeB3Pfl2ff3', new Event({}), {
          expectedRevision: 'stream_exists',
        });
      }).rejects.toThrow();
    });

    it('specific revision', async () => {
      const streamId = 'userf96_' + Math.random().toString(36).slice(2);
      await eventStoreService.appendToStream(streamId, new Event({}));
      await expect(
        eventStoreService.appendToStream('userf96_', new Event({}), {
          expectedRevision: -1n,
        }),
      ).rejects.toThrowError();
    });
  });

  it('contain expected revision', async () => {
    const streamId = 'user_O3xZqm8DFZla';
    let nextExpectedRevision = 0n;
    try {
      const events = await all(eventStoreService.readFromStart(streamId));
      const revision = last(events)?.revision;
      nextExpectedRevision = revision ? revision + 1n : 0n;
      // eslint-disable-next-line no-empty
    } catch {}
    const userRegisteredDto = { id: '719', name: 'ivan' };
    const userRegisteredEvent = new Event<typeof userRegisteredDto>(userRegisteredDto);
    const result = await eventStoreService.appendToStream(
      streamId,
      userRegisteredEvent,
    );

    expect(result.nextExpectedRevision).toEqual(nextExpectedRevision);
  });

  it('subscribe all', async () => {
    const events = app.get<EventBus<typeof event>>(EventBus);
    const r = Math.random();
    const event = new Event({ name: 'Joye', r });
    const endData$ = lastValueFrom(
      events.pipe(
        filter<typeof event>(event => event.data.r === r),
        take(1),
      ),
    );
    await eventStoreService.appendToStream('user_650', event);
    await endData$;

    expect(event.data.name).toEqual('Joye');
  });

  it('add event without garbage', async () => {
    type GameStartedDto = { id: string };
    class GameStartedEvent extends Event<GameStartedDto> {}
    const streamId = `stream_${cuid()}`;

    const event = new GameStartedEvent({ id: '1' }, { date: new Date() });
    event['garbage'] = true;

    await eventStoreService.appendToStream(streamId, event);

    const events = await all(eventStoreService.readFromStart(streamId));
    expect(last(events)?.data).not.toHaveProperty('garbage');
    expect(last(events)).not.toHaveProperty('garbage');
  });
});

describe.skip('benchmark', () => {
  let stream: string;
  let client: EventStoreDBClient;

  beforeAll(async () => {
    stream = 'benchmark_stream_' + Math.random().toString(36).slice(2);
    const events = Array.from({ length: 99999 }).map((_, index) => ({
      type: 'SimpleAdd',
      data: { index },
    }));

    client = EventStoreDBClient.connectionString(eventstoreDbConnectionString);
    const eventStoreService = new EventStoreService(client, new Map() as any);

    await eventStoreService.appendToStream(stream, events).catch(err => {
      console.log('err', err);
    });
  });

  afterAll(async () => {
    await client?.dispose();
  });

  it('plain', async () => {
    const eventStoreService = new EventStoreService(client, new Map() as any);
    const streamEvents = eventStoreService.readFromStart(stream);
    const recordedEvents: any[] = [];
    for await (const event of streamEvents) {
      recordedEvents.push(event);
    }
  });

  // Fastest
  it('transform new class', async () => {
    class MyEvent extends Event {}
    const transform: any = {
      get(type) {
        return event => new MyEvent(event);
      },
    };
    const eventStoreService = new EventStoreService(client, transform);
    const streamEvents = eventStoreService.readFromStart(stream);
    const recordedEvents: any[] = [];
    for await (const event of streamEvents) {
      recordedEvents.push(event);
    }
  });

  it('object create', async () => {
    class MyEvent extends Event {}
    const transform: any = {
      get(type) {
        return event => {
          Object.create(MyEvent.prototype, {
            type: { value: event.type },
            data: { value: event.data },
            position: { value: event.position },
            metadata: { value: event.metadata },
            created: { value: event.created },
          });
        };
      },
    };

    const eventStoreService = new EventStoreService(client, transform);
    const streamEvents = eventStoreService.readFromStart(stream);
    const recordedEvents: any[] = [];
    for await (const event of streamEvents) {
      recordedEvents.push(event);
    }
  });
});
