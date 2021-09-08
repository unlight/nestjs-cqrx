import { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { EventBus } from '@nestjs/cqrs';
import expect from 'expect';
import all from 'it-all';
import { mock } from 'jest-mock-extended';
import { last } from 'lodash';

import { CqrxModule, Event } from '.';
import { EVENT_TRANSFORMERS } from './constants';
import { CqrxCoreModule } from './cqrx-core.module';
import { EventStore } from './drivers/eventstore';
import { EventStoreService } from './eventstore.service';
import { TransformerService } from './transformer.service';

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

describe('impl', () => {
    beforeAll(async () => {
        app = await NestFactory.create(
            {
                module: CqrxModule,
                imports: [
                    CqrxCoreModule.forRoot({
                        inMemory: true,
                        eventstoreDbConnectionString,
                    }),
                ],
                providers: [
                    // {
                    //     provide: EVENT_TRANSFORMERS,
                    //     useValue: { Event: event => new Event(event.data) },
                    // },
                ],
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

    it('append to stream', async () => {
        const userRegisteredDto = { id: '123', name: 'ivan' };
        const userRegisteredEvent = new Event<typeof userRegisteredDto>(
            userRegisteredDto,
        );
        await eventStoreService.appendToStream({
            streamId: 'user-123',
            event: userRegisteredEvent,
        });

        const events = await all(eventStoreService.readFromStart('user-123'));
        expect(last(events)?.data).toEqual({ id: '123', name: 'ivan' });
    });

    describe('append stream nostream', () => {
        it('nostream ok', async () => {
            const result = await eventStoreService.appendToStream({
                streamId: 'user-999',
                event: new Event({ id: '123' }),
                expectedRevision: 'NO_STREAM',
            });
            expect(result).toBeTruthy();
        });

        it('nostream error', async () => {
            await eventStoreService.appendToStream({
                streamId: 'user-123456789',
                event: new Event({ id: 'X' }),
            });

            await expect(async () => {
                await eventStoreService.appendToStream({
                    streamId: 'user-123456789',
                    event: new Event({ id: 'XX' }),
                    expectedRevision: 'NO_STREAM',
                });
            }).rejects.toThrowError(
                'Expected no stream, but stream user-123456789 already exists',
            );
        });
    });

    describe('append stream exists', () => {
        it('exists error', async () => {
            await expect(
                all(eventStoreService.readFromStart('user-s4l1jxeB3Pfl2ff3')),
            ).rejects.toThrow('Stream user-s4l1jxeB3Pfl2ff3 not found');
            await expect(async () => {
                await eventStoreService.appendToStream({
                    streamId: 'user-s4l1jxeB3Pfl2ff3',
                    event: new Event({}),
                    expectedRevision: 'STREAM_EXISTS',
                });
            }).rejects.toThrowError('Expected stream user-s4l1jxeB3Pfl2ff3 exists');
        });
    });

    it('contain expected revision', async () => {
        const userRegisteredDto = { id: '123', name: 'ivan' };
        const userRegisteredEvent = new Event<typeof userRegisteredDto>(
            userRegisteredDto,
        );
        const result = await eventStoreService.appendToStream({
            streamId: 'user-O3xZqm8DFZla',
            event: userRegisteredEvent,
        });
        expect(result.expectedRevision).toEqual(1n);
    });

    it('subscribe all', async () => {
        const eventBus = app.get<EventBus<Event<{ name: string }>>>(EventBus);
        const event = new Event<{ name: string }>({ name: 'Joe' });
        let callbackCalled = false;
        eventBus.subject$.subscribe(event => {
            callbackCalled = true;
            expect(event.data.name).toEqual('Joe');
        });
        await eventStoreService.appendToStream({
            streamId: 'user-123',
            event,
        });
        expect(callbackCalled).toBe(true);
    });
});
