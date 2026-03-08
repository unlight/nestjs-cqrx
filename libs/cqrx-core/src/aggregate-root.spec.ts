import 'reflect-metadata';

import { createId } from '@paralleldrive/cuid2';
import { expect, it, vi } from 'vitest';
import { AggregateRoot } from './aggregate-root.ts';
import { EventHandler } from './event-handler.decorator.ts';
import { Event } from './event.js';

class UserCreatedEvent extends Event {}
class UserChangedEmailEvent extends Event {}
class UserAggregateRoot extends AggregateRoot {
  protected static readonly aggregateType: string = 'user';
  @EventHandler(UserCreatedEvent)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onUserCreated(event) {}
}

import { mock, MockFunctionContext } from 'node:test';
import { from, lastValueFrom } from 'rxjs';

it('version', async () => {
  const user = new UserAggregateRoot(createId());
  await user.applyFromHistory(new UserCreatedEvent());
  expect(user.version).toEqual(1);
});

it('commit', async () => {
  // Arrange
  const user = new UserAggregateRoot(createId());
  const publishAll = vi.spyOn(user, 'publishAll').mockResolvedValue();
  // Act
  user.apply(new UserCreatedEvent());
  await user.commit();
  // Assert
  expect(publishAll).toHaveBeenCalledOnce();
});

it('event handler returns observer', async () => {
  // Arrange
  class UserAggregateRoot extends AggregateRoot {
    // @ts-expect-error Unknown
    @EventHandler(UserChangedEmailEvent)
    userChangedEmail() {
      return from(['tick', 'tack', 'toe']);
    }
  }
  const user = new UserAggregateRoot(createId());
  mock.method(user, 'userChangedEmail');
  const spy = user.userChangedEmail['mock'] as MockFunctionContext<
    typeof user.userChangedEmail
  >;
  // Act
  await user.applyFromHistory(new UserChangedEmailEvent());
  // Assert
  expect(spy.calls).toHaveLength(1);
  const { result } = spy.calls[0] ?? {};
  expect(result && (await lastValueFrom(result))).toEqual('toe');
});

it('save uncommit events', async () => {
  // Arrange
  const user = new UserAggregateRoot(createId());
  vi.spyOn(user, 'publishAll').mockResolvedValue();
  // Act
  user.apply(new UserCreatedEvent());
  await user.commit();
  // Assert
  expect(user.getUncommittedEvents()).toHaveLength(0);
});

it('custom name', () => {
  class UserAggregateRoot extends AggregateRoot {
    static aggregateType = 'User';
  }
  const id = createId();
  const user = new UserAggregateRoot(id);
  expect(user.stream).toEqual(`User_${id}`);
});
