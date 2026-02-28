import all from 'it-all';
import { last } from 'lodash';

import { randomInt } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { IEventStoreClient } from './eventstore-client.ts';
import { EventStoreService } from './eventstore.service';
import {
  dbxEventStoreClient,
  kurrentdbEventStoreClient,
  TestEvent,
} from '../testing/index.ts';
import { TransformService } from './transform.service.ts';

const randomString = () => randomInt(2 ** 48 - 1).toString(36);
let eventstoreClient: IEventStoreClient;
let eventStoreService: EventStoreService;

describe.each([
  // { factory: dbxEventStoreClient },
  { factory: kurrentdbEventStoreClient },
])('eventStoreService implementation $factory.name', ({ factory }) => {
  beforeAll(async () => {
    eventstoreClient = await factory();
    eventStoreService = new EventStoreService(
      eventstoreClient,
      new TransformService(),
    );
  });

  afterAll(async () => {
    await eventstoreClient.disconnect();
  });

  it('smoke', () => {
    expect(eventstoreClient).toBeDefined();
  });

  it('create stream', async () => {
    // Arrange
    const stream = `user_${randomString()}`;
    const userRegisteredDto = { name: 'ivan' };
    const userRegisteredEvent = new TestEvent<typeof userRegisteredDto>(
      userRegisteredDto,
    );
    // Act
    await eventStoreService.create(stream, userRegisteredEvent);
    // Assert
    const events = await all(eventStoreService.read(stream));
    const event = last(events);
    expect(event?.data).toEqual({ name: 'ivan' });
  });
});
