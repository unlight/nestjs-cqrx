import { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { CqrxCoreModule } from './cqrx-core.module';
import { CqrxModule } from './cqrx.module';
import { Event } from './event';
import { EventStoreService } from './eventstore.service';
import { expect } from 'expect';

const eventstoreDatabaseConnectionString =
  'kurrentdb://localhost:34605?tls=false&keepAliveTimeout=120000&keepAliveInterval=120000';

describe('eventstore', () => {
  let app: INestApplication;
  let eventStoreService: EventStoreService;

  before(async () => {
    app = await NestFactory.create(
      {
        imports: [
          CqrxCoreModule.forRoot({
            eventstoreConnectionString: eventstoreDatabaseConnectionString,
          }),
          CqrxModule.forFeature([], [Event]),
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

  after(async () => {
    await app.close();
  });

  it('smoke', () => {
    expect(eventStoreService).toBeDefined();
  });
});
