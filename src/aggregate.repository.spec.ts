import { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { randomInt } from 'crypto';
import cuid from 'cuid';
import expect from 'expect';

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
    protected static readonly streamName = 'user';
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
        imports: [
          CqrxCoreModule.forRoot({ eventstoreDbConnectionString }),
          CqrxModule.forFeature(
            [UserAggregateRoot],
            [Event, UserCreatedEvent, UserChangedEmailEvent],
          ),
        ],
        module: CqrxModule,
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
    repository = new AggregateRepository(eventStoreService, UserAggregateRoot);
  });

  it('smoke', () => {
    expect(repository).toBeTruthy();
  });

  it('findOne not found', async () => {
    const error = (await repository
      .load('951')
      .catch((error: unknown) => error)) as Error;

    expect(error.message).toEqual('user_951 not found');
    expect(error.constructor.name).toEqual('StreamNotFoundError');
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
        email: 'ivan@mail.com',
        name: 'Ivan',
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
      const aggregate2 = repository.create('123');
      expect(aggregate2.streamId).toBe('user_123');
    });

    it('commit should not fail', async () => {
      const aggregate = repository.create('359');
      await aggregate.commit();
    });
  });

  describe('expected revision', () => {
    it('for new stream', async () => {
      const user = repository.create(randomInt(999_999_999).toString());
      user.apply(new UserChangedEmailEvent({ email: 'toxostoma@wankly.co.uk' }));
      await user.commit();
    });

    it('for existing stream', async () => {
      const streamId = randomInt(999_999_999).toString();
      const user = repository.create(streamId);
      user.apply(new UserChangedEmailEvent({ email: 'promiscuity@lapicide1.net' }));
      user.apply(new UserChangedEmailEvent({ email: 'promiscuity@lapicide2.net' }));
      await user.commit();
      const user2 = await repository.load(streamId);
      user2.apply(new UserChangedEmailEvent({ email: 'promiscuity@lapicide3.net' }));
      await user2.commit();
    });

    it('error when wrong revision', async () => {
      const streamId = randomInt(999_999_999).toString();
      const user = repository.create(streamId);

      user.revision = 1000n;

      await expect(user.commit()).rejects.toThrowError();
    });
  });
});
