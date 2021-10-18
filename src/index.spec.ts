import { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { EventBus } from '@nestjs/cqrs';
import expect from 'expect';
import all from 'it-all';
import { last } from 'lodash';
import { filter } from 'rxjs';

import { CqrxModule, Event } from '.';
import { AggregateRepository } from './aggregate.repository';
import { AggregateRoot } from './aggregate-root';
import { CqrxCoreModule } from './cqrx-core.module';
import { EventStoreService } from './eventstore.service';

// eslint-disable-next-line unicorn/prevent-abbreviations
const eventstoreDbConnectionString = 'esdb://localhost:2113?tls=false';
let app: INestApplication;
let eventStoreService: EventStoreService;

describe('event', () => {
    it('type name', () => {
        class TestEvent extends Event {}

        const event = new TestEvent({});
        expect(event.type).toBe('TestEvent');
    });
});

describe('memory impl', () => {
    impl({
        imports: [CqrxCoreModule.forRoot({ inMemory: true })],
        providers: [],
    });
});

// describe('eventstore impl', () => {
//     impl({
//         imports: [CqrxCoreModule.forRoot({ eventstoreDbConnectionString })],
//         providers: [],
//     });
// });

function impl({ imports = [], providers = [] }: { imports: any[]; providers: any[] }) {
    beforeAll(async () => {
        app = await NestFactory.create(
            {
                module: CqrxModule,
                imports,
                providers,
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

    it('smoke', () => {
        expect(app).toBeTruthy();
    });

    describe('aggregate root', () => {
        class UserAggregateRoot extends AggregateRoot {}
        let aggregate: UserAggregateRoot;

        beforeEach(() => {
            aggregate = new UserAggregateRoot('user', '532');
        });

        it('aggregate root smoke', () => {
            expect(aggregate).toBeTruthy();
        });
    });

    describe('aggregate repository', () => {
        let repository: AggregateRepository<UserAggregateRoot>;
        class UserAggregateRoot extends AggregateRoot {}

        beforeEach(() => {
            repository = new AggregateRepository(
                eventStoreService,
                UserAggregateRoot,
                'user',
            );
        });

        it('smoke', () => {
            expect(repository).toBeTruthy();
        });

        it('findOne ok', async () => {
            const result = await repository.findOne('951');
            expect(result).toBeTruthy();
            expect(result.streamId).toBe('user-951');
            expect(result.version).toBe(-1);
        });
    });

    describe('append to stream', () => {
        it('append to stream', async () => {
            const userRegisteredDto = { id: '392', name: 'ivan' };
            const userRegisteredEvent = new Event<typeof userRegisteredDto>(
                userRegisteredDto,
            );
            await eventStoreService.appendToStream({
                streamId: 'user-392',
                event: userRegisteredEvent,
            });

            const events = await all(eventStoreService.readFromStart('user-392'));
            expect(last(events)?.data).toEqual({ id: '392', name: 'ivan' });
        });

        it('check event metadata', async () => {
            const userRegisteredDto = { id: '555', name: 'ivan' };
            const userRegisteredEvent = new Event<typeof userRegisteredDto>(
                userRegisteredDto,
            );
            await eventStoreService.appendToStream({
                streamId: 'user-555',
                event: userRegisteredEvent,
            });

            const events = await all(eventStoreService.readFromStart('user-555'));
            const event = last(events);

            expect(event?.type).toEqual('Event');
            expect(event?.streamId).toEqual('user-555');
            expect(typeof event?.id).toBe('string');
            expect(event?.revision).toBeGreaterThanOrEqual(1n);
            expect(event?.created.toString().slice(0, 8)).toEqual(
                Date.now().toString().slice(0, 8),
            );
        });
    });

    describe('append stream nostream', () => {
        it('nostream ok', async () => {
            const result = await eventStoreService.appendToStream({
                streamId: `user-${Math.random().toString(36).slice(2)}`,
                event: new Event({ id: '1' }),
                expectedRevision: 'no_stream',
            });
            expect(result).toBeTruthy();
        });

        it('nostream error', async () => {
            const streamId = 'user-123456789';
            await eventStoreService.appendToStream({
                streamId: streamId,
                event: new Event({ id: 'X' }),
            });

            await expect(async () => {
                await eventStoreService.appendToStream({
                    streamId: streamId,
                    event: new Event({ id: 'XX' }),
                    expectedRevision: 'no_stream',
                });
            }).rejects.toThrowError(
                `Expected revision in ${streamId} do not match no_stream`,
            );
        });
    });

    describe('append stream exists', () => {
        it('exists error', async () => {
            await expect(
                all(eventStoreService.readFromStart('user-s4l1jxeB3Pfl2ff3')),
            ).rejects.toThrow(/user-s4l1jxeB3Pfl2ff3 not found/);
            await expect(async () => {
                await eventStoreService.appendToStream({
                    streamId: 'user-s4l1jxeB3Pfl2ff3',
                    event: new Event({}),
                    expectedRevision: 'stream_exists',
                });
            }).rejects.toThrowError(
                'Expected revision in user-s4l1jxeB3Pfl2ff3 do not match stream_exists',
            );
        });

        it('specific revision', async () => {
            await eventStoreService.appendToStream({
                streamId: 'user-f96ace8a',
                event: new Event({}),
            });
            await expect(
                eventStoreService.appendToStream({
                    streamId: 'user-f96ace8a',
                    event: new Event({}),
                    expectedRevision: 2n,
                }),
            ).rejects.toThrowError();
        });
    });

    it('contain expected revision', async () => {
        const userRegisteredDto = { id: '719', name: 'ivan' };
        const userRegisteredEvent = new Event<typeof userRegisteredDto>(
            userRegisteredDto,
        );
        const result = await eventStoreService.appendToStream({
            streamId: 'user-O3xZqm8DFZla',
            event: userRegisteredEvent,
        });
        expect(result.expectedRevision).toBeGreaterThanOrEqual(1n);
    });

    it('subscribe all', async () => {
        const r = Math.random();
        const event = new Event({ name: 'Joye', r });
        const eventBus = app.get<EventBus<typeof event>>(EventBus);
        let resolvePromise: (_: unknown) => void;
        const p = new Promise(resolve => {
            resolvePromise = resolve;
        });
        eventBus.subject$
            .pipe(filter<typeof event>(event => event.data.r === r))
            .subscribe(event => {
                expect(event.data.name).toEqual('Joye');
                resolvePromise();
            });
        await eventStoreService.appendToStream({
            streamId: 'user-650',
            event,
        });
        await p;
    });
}
