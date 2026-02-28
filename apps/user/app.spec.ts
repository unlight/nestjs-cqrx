import { INestApplication, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import request from 'supertest';

import { AllExceptionsFilter } from './app.exception-filter';
import { AppModule } from './app.module';
import { User } from './user/model/user';
import { aggregateRepositoryToken } from 'nestjs-cqrx';
import { expect, beforeAll, afterAll, it } from 'vitest';
import { Server } from 'node:http';
import { AggregateRepository } from 'cqrx-core';
import { createId } from '@paralleldrive/cuid2';

let app: INestApplication;
let server: Server;
beforeAll(async () => {
  app = await NestFactory.create(AppModule, { logger: false });
  app.enableCors();
  app.useGlobalPipes(new ValidationPipe({}));
  app.useGlobalFilters(new AllExceptionsFilter(app.getHttpAdapter()));
  server = app.getHttpServer() as Server;
  await app.init();
});

afterAll(async () => {
  await app.close();
});

it('smoke', async () => {
  const result = await request(server).get('/user/index').expect(200);
  expect(result.body).toBeTruthy();
});

it('register failure with empty', async () => {
  const result = await request(server)
    .post('/user/register')
    .set('Content-Type', 'application/json')
    .send({ email: '', password: '' });

  expect(result.body).toEqual(expect.objectContaining({ statusCode: 400 }));
});

it('register success', async () => {
  const response = await request(server)
    .post('/user/register')
    .set('Content-Type', 'application/json')
    .send({ email: 'separation@wordable.edu', password: '0a704641e6b5' });

  expect(response).toBeTruthy();
  expect(response.statusCode).toEqual(201);
});

it('register and view', async () => {
  const repository: AggregateRepository<User> = app.get(
    aggregateRepositoryToken(User),
  );
  const id = createId();
  const user = new User(id);
  user.register('reflective@exemplifiable.net', 'password');
  await repository.save(user);

  const user2 = await repository.load(id);

  expect(user2).toEqual(
    expect.objectContaining({
      isRegistered: true,
      email: 'reflective@exemplifiable.net',
      password: 'password',
    }),
  );
});

it('update email', async () => {
  // Arrange
  const repository: AggregateRepository<User> = app.get(
    aggregateRepositoryToken(User),
  );
  const id = createId();
  const user = new User(id);
  user.register('clavaria@unemploy.co.uk', 'password');
  await repository.save(user);
  // Act
  const response = await request(server)
    .post(`/user/${id}/updateEmail`)
    .set('Content-Type', 'application/json')
    .send({ email: 'yeanling@railwayless.org' });

  // Assert
  expect(response.body).toEqual({});
  const user3 = await repository.load(id);
  expect(user3.email).toEqual('yeanling@railwayless.org');
});
