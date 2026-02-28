import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { IEventStoreClient } from './eventstore-client.ts';

import { createId } from '@paralleldrive/cuid2';
import all from 'it-all';
import {
  dbxEventStoreClient,
  kurrentdbEventStoreClient,
} from '../testing/index.ts';

let eventstoreClient: IEventStoreClient;

describe.each([
  { factory: dbxEventStoreClient },
  { factory: kurrentdbEventStoreClient },
])('eventstoreClient implementation $factory.name', ({ factory }) => {
  beforeAll(async () => {
    eventstoreClient = await factory();
  });

  afterAll(async () => {
    await eventstoreClient.disconnect();
  });

  it('smoke', () => {
    expect(eventstoreClient).toBeDefined();
  });

  it('create stream/aggregate', async () => {
    const aggregateId = createId();
    const result = await eventstoreClient.create({
      aggregateId,
      aggregateType: 'user',
      eventData: { name: 'Joe' },
      eventType: 'user.created',
    });

    expect(result).toBeTruthy();
    expect(result.version).toBeTypeOf('bigint');
    expect(result.version).toBeGreaterThanOrEqual(0);
  });

  it('error when try to create existing stream', async () => {
    // Arrange
    const aggregateId = createId();
    await eventstoreClient.create({
      aggregateId,
      aggregateType: 'user',
      eventData: {},
      eventType: 'user.created',
    });
    // Act
    const result = await eventstoreClient
      .create({
        aggregateId,
        aggregateType: 'user',
        eventData: {},
        eventType: 'user.created',
      })
      .catch(error => ({ error }));
    // Assert
    expect('error' in result && result.error).toBeInstanceOf(Error);
  });

  it('apply events', async () => {
    // Arrange
    const aggregateId = createId();
    await eventstoreClient.create({
      aggregateId,
      aggregateType: 'user',
      eventData: {},
      eventType: 'user.created',
    });
    // Act
    await eventstoreClient.apply({
      aggregateId,
      aggregateType: 'user',
      eventData: { email: 'quittance@nodus.net' },
      eventType: 'user.updated',
    });
    // Assert
  });

  it('read events', async () => {
    // Arrange
    const aggregateId = createId();
    const aggregateType = 'user';
    await eventstoreClient.create({
      aggregateId,
      aggregateType,
      eventData: {},
      eventType: 'user_created',
    });
    for (let i = 0; i < 10; i++) {
      await eventstoreClient.apply({
        aggregateId,
        aggregateType,
        eventData: { email: `v${i}@trombiculid.net` },
        eventType: 'user_updated',
      });
    }
    // Act
    const eventIterator = eventstoreClient.read({ aggregateId, aggregateType });
    const events = await all(eventIterator);
    // Assert
    expect(events).toBeInstanceOf(Array);
    expect(events).toHaveLength(11);

    expect(
      events.slice(-10).every(e => e.type === 'user_updated'),
    ).toBeTruthy();
  });

  it('disconnect', async () => {
    await eventstoreClient.disconnect();
  });
});
