import { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import expect from 'expect';
import all from 'it-all';
import { last } from 'lodash';
import { from, lastValueFrom } from 'rxjs';
import cuid from 'cuid';

import {
  AggregateRoot,
  AggregateRepository,
  CqrxModule,
  Event,
  EventStoreService,
  EventHandler,
  EventPublisher,
} from '.';
import { aggregateRepositoryToken } from './aggregate.repository';
import { CqrxCoreModule } from './cqrx-core.module';
import { RecordedEvent } from './interfaces';
import { EventBus, EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { filter, take } from 'rxjs/operators';
import { TransformService } from './transform.service';

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

describe.only('transformerService', () => {
  class CatAggregateRoot extends AggregateRoot {}
  class CatRegisteredEvent extends Event {}
  class CatFeedEvent extends Event {}
  class CatStrokedEvent extends Event {}

  beforeAll(async () => {
    app = await NestFactory.create(
      {
        module: CqrxModule,
        imports: [
          CqrxCoreModule.forRoot({ eventstoreDbConnectionString }),
          CqrxModule.forFeature(
            [CatAggregateRoot],
            [
              CatStrokedEvent,
              CatFeedEvent,
              [
                'CatRegisteredEvent',
                (event: RecordedEvent) => {
                  return new CatRegisteredEvent(event.data);
                },
              ],
            ],
          ),
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

  it('read should be transformed', async () => {
    const event = new CatRegisteredEvent({ name: 'Fluffy' });
    const streamId = `cat_${cuid()}`;
    await eventStoreService.appendToStream(streamId, event);
    const events = await all(eventStoreService.readFromStart(streamId));
    expect(events).toEqual([{ data: { name: 'Fluffy' }, type: 'CatRegisteredEvent' }]);
    const names = events.map(event => event.constructor.name);
    expect(names).toEqual(['CatRegisteredEvent']);
  });

  it('transform key', async () => {
    const event = new CatFeedEvent();
    const streamId = `cat_${cuid()}`;
    await eventStoreService.appendToStream(streamId, event);
    const events = await all(eventStoreService.readFromStart(streamId));

    expect(events).toEqual([
      expect.objectContaining({ data: {}, type: 'CatFeedEvent' }),
    ]);

    const names = events.map(event => event.constructor.name);

    expect(names).toEqual(['CatFeedEvent']);
  });

  it('transform ctor name', async () => {
    const event = new CatStrokedEvent();
    const streamId = `cat_${cuid()}`;
    await eventStoreService.appendToStream(streamId, event);
    const events = await all(eventStoreService.readFromStart(streamId));

    expect(events).toEqual([
      expect.objectContaining({ data: {}, type: 'CatStrokedEvent' }),
    ]);

    const names = events.map(event => event.constructor.name);

    expect(names).toEqual(['CatStrokedEvent']);
  });
});

describe('transformerService', () => {
  class CatFeedEvent extends Event {}
  class CatStrokedEvent extends Event {}

  @EventsHandler(CatFeedEvent)
  class CatFeedEventHandler implements IEventHandler<CatFeedEvent> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    handle(_event: CatFeedEvent) {}
  }

  beforeAll(async () => {
    app = await NestFactory.create(
      {
        module: CqrxModule,
        imports: [
          CqrxCoreModule.forRoot({ eventstoreDbConnectionString }),
          CqrxModule.forFeature([], [CatStrokedEvent]),
        ],
        providers: [CatFeedEventHandler],
      },
      {
        logger: false,
      },
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('event added to transform from nest cqrs events handler decorator', () => {
    const transformService = app.get(TransformService);
    const transform = transformService.get('CatFeedEvent');

    expect(transform).toBeInstanceOf(Function);
  });
});

describe('eventstore', () => {
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

  describe('aggregate repository', () => {
    let repository: AggregateRepository<UserAggregateRoot>;
    class UserAggregateRoot extends AggregateRoot {}

    beforeEach(() => {
      repository = new AggregateRepository(
        eventStoreService,
        UserAggregateRoot,
        'user',
      );
    });

    it('smoke', () => {
      expect(repository).toBeTruthy();
    });

    it('findOne not found', async () => {
      const err = (await repository
        .findOne('951')
        .catch((error: unknown) => error)) as Error;

      expect(err.message).toEqual('user_951 not found');
      expect(err.constructor.name).toEqual('StreamNotFoundError');
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

    expect(result.expectedRevision).toEqual(nextExpectedRevision);
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

describe('AggregateRoot', () => {
  class UserCreatedEvent extends Event {}
  class UserChangedEmailEvent extends Event {}
  class UserAggregateRoot extends AggregateRoot {
    @EventHandler(UserCreatedEvent)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    onUserCreated(event) {}
  }
  let userAggregateRootRepository: AggregateRepository<UserAggregateRoot>;

  beforeAll(async () => {
    app = await NestFactory.create(
      {
        module: CqrxModule,
        imports: [
          CqrxCoreModule.forRoot({ eventstoreDbConnectionString }),
          CqrxModule.forFeature([UserAggregateRoot]),
        ],
        providers: [],
      },
      {
        logger: false,
      },
    );
    await app.init();
    userAggregateRootRepository = app.get<AggregateRepository<UserAggregateRoot>>(
      aggregateRepositoryToken(UserAggregateRoot),
    );
    eventStoreService = app.get(EventStoreService);
  });

  afterAll(async () => {
    await app.close();
  });

  it('version', async () => {
    const user = new UserAggregateRoot('user', cuid());
    await user.applyFromHistory(new UserCreatedEvent());

    expect(user.version).toEqual(1);
  });

  it('commit', async () => {
    let user = new UserAggregateRoot('user', cuid());
    const eventPublisher = app.get(EventPublisher);
    user = eventPublisher.mergeObjectContext(user);
    user.apply(new UserCreatedEvent());
    await user.commit();

    const events = await all(eventStoreService.readFromStart(user.streamId));

    expect(events).toHaveLength(1);
  });

  it('event handler returns observer', async () => {
    class UserAggregateRoot extends AggregateRoot {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      @EventHandler(UserChangedEmailEvent)
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      userChangedEmail(event) {
        return from(['tick', 'tack', 'toe']);
      }
    }
    const user = new UserAggregateRoot('user', cuid());
    const spy = jest.spyOn(user, 'userChangedEmail');
    await user.applyFromHistory(new UserChangedEmailEvent());

    expect(spy).toHaveBeenCalled();
    expect(await lastValueFrom(spy.mock.results[0]?.value)).toEqual('toe');
  });

  it('event handler', async () => {
    const user = new UserAggregateRoot('user', cuid());
    const onUserCreatedSpy = jest.spyOn(user, 'onUserCreated');
    user.apply(new UserCreatedEvent());
    await userAggregateRootRepository.save(user);

    expect(onUserCreatedSpy).toHaveBeenCalled();
  });

  it('save uncommit events', async () => {
    const user = new UserAggregateRoot('user', cuid());
    user.apply(new UserCreatedEvent());
    await userAggregateRootRepository.save(user);

    expect(user.getUncommittedEvents()).toHaveLength(0);
  });

  it('double save', async () => {
    const user = new UserAggregateRoot('user', cuid());
    user.apply(new UserCreatedEvent());
    await userAggregateRootRepository.save(user);
    await userAggregateRootRepository.save(user);

    const events = await all(eventStoreService.readFromStart(user.streamId));

    expect(events).toHaveLength(1);
    expect(events).toEqual([expect.objectContaining({ type: 'UserCreatedEvent' })]);
  });
});

describe('EventPublisher', () => {
  beforeAll(async () => {
    app = await NestFactory.create(
      {
        module: CqrxModule,
        imports: [CqrxCoreModule.forRoot({ eventstoreDbConnectionString })],
        providers: [],
      },
      {
        logger: false,
      },
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  class UserAggregateRoot extends AggregateRoot {}

  it('mergeClassContext', async () => {
    const eventPublisher = app.get(EventPublisher);
    const UserModel = eventPublisher.mergeClassContext(UserAggregateRoot);
    const user = new UserModel('user', cuid());

    await user.publish(new Event());
    const events = await all(eventStoreService.readFromStart(user.streamId));
    expect(events).toHaveLength(1);
  });

  it('mergeObjectContext', async () => {
    const eventPublisher = app.get(EventPublisher);
    let user = new UserAggregateRoot('user', cuid());
    user = eventPublisher.mergeObjectContext(user);

    await user.publish(new Event());
    const events = await all(eventStoreService.readFromStart(user.streamId));
    expect(events).toHaveLength(1);
  });
});
