import { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import expect from 'expect';

import { AggregateRoot, CqrxModule, Event, EventStoreService, RecordedEvent } from '.';
import { CqrxCoreModule } from './cqrx-core.module';
import { TransformService } from './transform.service';
import cuid from 'cuid';
import all from 'it-all';

// eslint-disable-next-line unicorn/prevent-abbreviations
const eventstoreDbConnectionString =
  'esdb://localhost:2113?tls=false&keepAliveTimeout=120000&keepAliveInterval=120000';
let app: INestApplication;
let eventStoreService: EventStoreService;

describe('transformerService', () => {
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

  it('event added to transform from nest cqrs events handler decorator', () => {
    const transformService = app.get(TransformService);
    const transform = transformService.get('CatFeedEvent');

    expect(transform).toBeInstanceOf(Function);
  });
});
