import { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import cuid from 'cuid';
import all from 'it-all';

import { CqrxCoreModule } from './cqrx-core.module';
import {
  AggregateRoot,
  CqrxModule,
  Event,
  EventStoreService,
  RecordedEvent,
} from './index';
import { TransformService } from './transform.service';
import expect from 'expect';

const eventstoreConnectionString =
  'kurrentdb://localhost:34605?tls=false&keepAliveTimeout=120000&keepAliveInterval=120000';
let app: INestApplication;
let eventStoreService: EventStoreService;

describe('transformerService', () => {
  class CatAggregateRoot extends AggregateRoot {}
  class CatRegisteredEvent extends Event {}
  class CatFeedEvent extends Event {}
  class CatStrokedEvent extends Event {}

  before(async () => {
    app = await NestFactory.create(
      {
        imports: [
          CqrxCoreModule.forRoot({ eventstoreConnectionString }),
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
        module: CqrxModule,
        providers: [],
      },
      // { logger: false },
    );
    await app.init();
    eventStoreService = app.get(EventStoreService);
  });

  after(async () => {
    await app.close();
  });

  it('read should be transformed', async () => {
    const event = new CatRegisteredEvent({ name: 'Fluffy' });
    const streamId = `cat_${cuid()}`;
    await eventStoreService.appendToStream(streamId, event);
    const events = await all(eventStoreService.readFromStart(streamId));
    expect(events).toEqual([
      { data: { name: 'Fluffy' }, type: 'CatRegisteredEvent' },
    ]);
    const names = events.map(event => event.constructor.name);
    expect(names).toEqual(['CatRegisteredEvent']);
  });

  it('transform key', async () => {
    const event = new CatFeedEvent();
    const streamId = `cat_${cuid()}`;
    await eventStoreService.appendToStream(streamId, event);
    const events = await all(eventStoreService.readFromStart(streamId));
    // Assert
    expect(events).toHaveLength(1);
    expect(events[0]).toEqual(
      expect.objectContaining({ data: {}, type: 'CatFeedEvent' }),
    );

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

  it('event added to transform from nest cqrs events handler decorator', () => {
    const transformService = app.get(TransformService);
    const transform = transformService.get('CatFeedEvent');

    expect(transform).toBeInstanceOf(Function);
  });
});
