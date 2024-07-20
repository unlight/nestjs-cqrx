import { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import cuid from 'cuid';
import expect from 'expect';
import all from 'it-all';
import { from, lastValueFrom } from 'rxjs';

import {
  AggregateRepository,
  AggregateRoot,
  CqrxModule,
  Event,
  EventHandler,
  EventPublisher,
  EventStoreService,
} from '.';
import { aggregateRepositoryToken } from './aggregate.repository';
import { CqrxCoreModule } from './cqrx-core.module';

describe('AggregateRoot', () => {
  // eslint-disable-next-line unicorn/prevent-abbreviations
  const eventstoreDbConnectionString = 'esdb://localhost:2113?tls=false';
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

  beforeAll(async () => {
    app = await NestFactory.create(
      {
        imports: [
          CqrxCoreModule.forRoot({ eventstoreDbConnectionString }),
          CqrxModule.forFeature([UserAggregateRoot]),
        ],
        module: CqrxModule,
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
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      @EventHandler(UserChangedEmailEvent)
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      userChangedEmail(event) {
        return from(['tick', 'tack', 'toe']);
      }
    }
    const user = new UserAggregateRoot(cuid());
    const spy = jest.spyOn(user, 'userChangedEmail');
    await user.applyFromHistory(new UserChangedEmailEvent());

    expect(spy).toHaveBeenCalled();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    expect(await lastValueFrom(spy.mock.results[0]?.value)).toEqual('toe');
  });

  it('event handler', async () => {
    const user = new UserAggregateRoot(cuid());
    const onUserCreatedSpy = jest.spyOn(user, 'onUserCreated');
    user.apply(new UserCreatedEvent());
    await userAggregateRootRepository.save(user);

    expect(onUserCreatedSpy).toHaveBeenCalled();
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
    expect(events).toEqual([expect.objectContaining({ type: 'UserCreatedEvent' })]);
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
});
