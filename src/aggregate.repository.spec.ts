import { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import expect from 'expect';

import cuid from 'cuid';
import {
  AggregateRepository,
  AggregateRoot,
  CqrxModule,
  Event,
  EventHandler,
  EventStoreService,
} from '.';
import { CqrxCoreModule } from './cqrx-core.module';

describe('aggregate repository', () => {
  // eslint-disable-next-line unicorn/prevent-abbreviations
  const eventstoreDbConnectionString = 'esdb://localhost:2113?tls=false';
  let app: INestApplication;
  let eventStoreService: EventStoreService;
  let repository: AggregateRepository<UserAggregateRoot>;
  class UserCreatedEvent extends Event<{ name: string }> {
    data!: { name: string };
  }
  class UserChangedEmailEvent extends Event<{ email: string }> {
    data!: { email: string };
  }
  class UserBlockedEvent extends Event {}
  class UserAggregateRoot extends AggregateRoot {
    name: string = '';
    email: string = '';
    isBlocked = false;
    @EventHandler(UserCreatedEvent)
    onUserCreated(event: UserCreatedEvent) {
      this.name = event.data.name;
    }

    @EventHandler(UserChangedEmailEvent)
    onUserChangedEmail(event: UserChangedEmailEvent) {
      this.email = event.data.email;
    }

    @EventHandler(UserBlockedEvent)
    onBlock(event: UserBlockedEvent) {
      this.isBlocked = true;
    }
  }

  beforeAll(async () => {
    app = await NestFactory.create(
      {
        module: CqrxModule,
        imports: [
          CqrxCoreModule.forRoot({ eventstoreDbConnectionString }),
          CqrxModule.forFeature(
            [UserAggregateRoot],
            [Event, UserCreatedEvent, UserChangedEmailEvent],
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

  beforeEach(() => {
    repository = new AggregateRepository(eventStoreService, UserAggregateRoot, 'user');
  });

  it('smoke', () => {
    expect(repository).toBeTruthy();
  });

  it('findOne not found', async () => {
    const err = (await repository
      .load('951')
      .catch((error: unknown) => error)) as Error;

    expect(err.message).toEqual('user_951 not found');
    expect(err.constructor.name).toEqual('StreamNotFoundError');
  });

  it('load from event store', async () => {
    const streamId = cuid();
    const streamName = `user_${streamId}`;
    await eventStoreService.appendToStream(streamName, [
      new UserCreatedEvent({ name: 'Ivan' }),
      new UserChangedEmailEvent({ email: 'ivan@mail.com' }),
    ]);
    const user = await repository.load(streamId);

    expect(user).toEqual(
      expect.objectContaining({
        name: 'Ivan',
        email: 'ivan@mail.com',
        revision: 1n,
      }),
    );
  });

  it('auto register handler from EventHandler decorator', async () => {
    const streamId = cuid();
    const streamName = `user_${streamId}`;
    await eventStoreService.appendToStream(streamName, [new UserBlockedEvent()]);
    const user = await repository.load(streamId);

    expect(user.isBlocked).toEqual(true);
  });

  describe('parse stream id and aggregate', () => {
    const streamId = cuid();
    before(async () => {
      const streamName = `user_${streamId}`;
      await eventStoreService.appendToStream(streamName, [
        new UserCreatedEvent({ name: 'Ivan' }),
      ]);
    });

    it('given string id', async () => {
      const [id, aggregate] = await repository.streamIdAndAggregate(streamId);
      expect(id).toEqual(streamId);
      expect(aggregate).toEqual(
        expect.objectContaining({
          id: streamId,
          name: 'Ivan',
          streamId: `user_${streamId}`,
        }),
      );
    });

    it('given aggregate', async () => {
      const model = await repository.load(streamId);
      const [id, aggregate] = await repository.streamIdAndAggregate(model);
      expect(id).toEqual(streamId);
      expect(aggregate).toEqual(
        expect.objectContaining({
          id: streamId,
          name: 'Ivan',
          streamId: `user_${streamId}`,
        }),
      );
    });
  });

  describe('create', () => {
    it('one argument', () => {
      const aggregate = repository.create('123');
      expect(aggregate.id).toBe('123');
    });

    it('two arguments', () => {
      const aggregate2 = repository.create('user', '123');
      expect(aggregate2.streamId).toBe('user_123');
    });

    it('commit should not fail', async () => {
      const aggregate = repository.create('359');
      await aggregate.commit();
    });
  });
});
