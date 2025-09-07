import { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import cuid from 'cuid';
import all from 'it-all';
import { from, lastValueFrom } from 'rxjs';
import { mock, MockFunctionContext } from 'node:test';

import {
  AggregateRepository,
  AggregateRoot,
  CqrxModule,
  Event,
  EventHandler,
  EventPublisher,
  EventStoreService,
} from './index';
import { aggregateRepositoryToken } from './aggregate.repository';
import { CqrxCoreModule } from './cqrx-core.module';
import expect from 'expect';

describe('AggregateRoot', () => {
  const eventstoreConnectionString = 'kurrentdb://localhost:34605?tls=false';
  let app: INestApplication;
  let eventStoreService: EventStoreService;
  class UserCreatedEvent extends Event {}
  class UserChangedEmailEvent extends Event {}
  class UserAggregateRoot extends AggregateRoot {
    protected static readonly streamName: string = 'user';
    @EventHandler(UserCreatedEvent)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    onUserCreated(event) {}
  }
  let userAggregateRootRepository: AggregateRepository<UserAggregateRoot>;

  before(async () => {
    app = await NestFactory.create(
      {
        imports: [
          CqrxCoreModule.forRoot({ eventstoreConnectionString }),
          CqrxModule.forFeature([UserAggregateRoot]),
        ],
        module: CqrxModule,
        providers: [],
      },
      { logger: false },
    );
    await app.init();
    userAggregateRootRepository = app.get<
      AggregateRepository<UserAggregateRoot>
    >(aggregateRepositoryToken(UserAggregateRoot));
    eventStoreService = app.get(EventStoreService);
  });

  after(async () => {
    await app.close();
  });

  it('smoke', () => {
    expect(app).toBeDefined();
  });

  it('version', async () => {
    const user = new UserAggregateRoot(cuid());
    await user.applyFromHistory(new UserCreatedEvent());

    expect(user.version).toEqual(1);
  });

  it('commit', async () => {
    let user = new UserAggregateRoot(cuid());
    const eventPublisher = app.get(EventPublisher);
    user = eventPublisher.mergeObjectContext(user);
    user.apply(new UserCreatedEvent());
    await user.commit();

    const events = await all(eventStoreService.readFromStart(user.streamId));

    expect(events).toHaveLength(1);
  });

  it('event handler returns observer', async () => {
    class UserAggregateRoot extends AggregateRoot {
      // @ts-expect-error Unknown
      @EventHandler(UserChangedEmailEvent)
      userChangedEmail() {
        return from(['tick', 'tack', 'toe']);
      }
    }
    const user = new UserAggregateRoot(cuid());
    mock.method(user, 'userChangedEmail');
    const spy = user.userChangedEmail['mock'] as MockFunctionContext<
      typeof user.userChangedEmail
    >;

    // Act
    await user.applyFromHistory(new UserChangedEmailEvent());
    // Assert
    expect(spy.calls).toHaveLength(1);

    const result = spy.calls[0]?.result;

    expect(result && (await lastValueFrom(result))).toEqual('toe');
  });

  it('event handler', async () => {
    const user = new UserAggregateRoot(cuid());
    mock.method(user, 'onUserCreated');
    const spy = user.onUserCreated['mock'] as MockFunctionContext<
      typeof user.onUserCreated
    >;
    user.apply(new UserCreatedEvent());
    await userAggregateRootRepository.save(user);

    expect(spy.calls).toHaveLength(1);
  });

  it('save uncommit events', async () => {
    const user = new UserAggregateRoot(cuid());
    user.apply(new UserCreatedEvent());
    await userAggregateRootRepository.save(user);

    expect(user.getUncommittedEvents()).toHaveLength(0);
  });

  it('double save', async () => {
    const user = new UserAggregateRoot(cuid());
    user.apply(new UserCreatedEvent());
    await userAggregateRootRepository.save(user);
    await userAggregateRootRepository.save(user);

    const events = await all(eventStoreService.readFromStart(user.streamId));

    expect(events).toHaveLength(1);
    expect(events).toEqual([
      expect.objectContaining({ type: 'UserCreatedEvent' }),
    ]);
  });

  it('eventPublisher mergeClassContext', async () => {
    const eventPublisher = app.get(EventPublisher);
    const UserModel = eventPublisher.mergeClassContext(UserAggregateRoot);
    const user = new UserModel(cuid());

    await user.publish(new Event());
    const events = await all(eventStoreService.readFromStart(user.streamId));
    expect(events).toHaveLength(1);
  });

  it('eventPublisher mergeObjectContext', async () => {
    const eventPublisher = app.get(EventPublisher);
    let user = new UserAggregateRoot(cuid());
    user = eventPublisher.mergeObjectContext(user);

    await user.publish(new Event());
    const events = await all(eventStoreService.readFromStart(user.streamId));
    expect(events).toHaveLength(1);
  });

  it('custom name', () => {
    class UserAggregateRoot extends AggregateRoot {
      static streamName = 'User';
    }
    const id = cuid();
    const user = new UserAggregateRoot(id);
    expect(user.streamId).toEqual(`User_${id}`);
  });

  it('publish and publishAll are not enumerable', () => {
    const eventPublisher = app.get(EventPublisher);
    const UserModel = eventPublisher.mergeClassContext(UserAggregateRoot);
    const user1 = new UserModel(cuid());

    expect(Object.keys(user1)).not.toContainEqual('publish');
    expect(Object.keys(user1)).not.toContainEqual('publishAll');

    const user2 = userAggregateRootRepository.create(cuid());

    expect(Object.keys(user2)).not.toContainEqual('publish');
    expect(Object.keys(user2)).not.toContainEqual('publishAll');
  });
});
