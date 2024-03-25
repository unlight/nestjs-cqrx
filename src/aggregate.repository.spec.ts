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
  class UserAggregateRoot extends AggregateRoot {
    name: string = '';
    email: string = '';
    @EventHandler(UserCreatedEvent)
    onUserCreated(event: UserCreatedEvent) {
      this.name = event.data.name;
    }

    @EventHandler(UserChangedEmailEvent)
    onUserChangedEmail(event: UserChangedEmailEvent) {
      this.email = event.data.email;
    }
  }

  beforeAll(async () => {
    app = await NestFactory.create(
      {
        module: CqrxModule,
        imports: [
          CqrxCoreModule.forRoot({ eventstoreDbConnectionString }),
          CqrxModule.forFeature([], [Event, UserCreatedEvent, UserChangedEmailEvent]),
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
      .findOne('951')
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
    const user = await repository.findOne(streamId);

    expect(user).toEqual(
      expect.objectContaining({
        name: 'Ivan',
        email: 'ivan@mail.com',
        revision: 1n,
      }),
    );
  });
});
