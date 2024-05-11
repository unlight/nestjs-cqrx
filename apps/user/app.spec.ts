import { INestApplication, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import request from 'supertest';
import { inspect } from 'util';

import { AllExceptionsFilter } from './app.exception-filter';
import { AppModule } from './app.module';
import expect from 'expect';
import { User } from './user/model/user';
import { AggregateRepository, aggregateRepositoryToken } from 'nestjs-cqrx';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const d = (o: any) =>
  console.log(inspect(o, { colors: true, depth: null, compact: true }));

let app: INestApplication;
let server: any;
beforeAll(async () => {
  app = await NestFactory.create(AppModule, { logger: false });
  app.enableCors();
  app.useGlobalPipes(new ValidationPipe({}));
  app.useGlobalFilters(new AllExceptionsFilter(app.getHttpAdapter()));
  server = app.getHttpServer();
  await app.init();
});

afterAll(async () => {
  await app.close();
});

it('smoke', async () => {
  const result = await request(server)
    .get('/user/index')
    .expect(200)
    .then(response => response.body);
  expect(result).toBeTruthy();
});

it('register failure with empty', async () => {
  const result = await request(server)
    .post('/user/register')
    .set('Content-Type', 'application/json')
    .send({ email: '', password: '' })
    .then(response => response.body);
  expect(result).toEqual(expect.objectContaining({ statusCode: 400 }));
});

it('register success', async () => {
  const response = await request(server)
    .post('/user/register')
    .set('Content-Type', 'application/json')
    .send({ email: 'separation@wordable.edu', password: '0a704641e6b5' })
    .then(response => response);
  expect(response).toBeTruthy();
  expect(response).toEqual(
    expect.objectContaining({
      statusCode: 201,
    }),
  );
});

it('register and view', async () => {
  const repository: AggregateRepository<User> = app.get(aggregateRepositoryToken(User));
  const id = Math.random().toString(36).slice(2);
  const user = new User('User', id);
  user.register('reflective@exemplifiable.net', 'password');
  await repository.save(user);

  const user2 = await repository.load(id);
  console.log({ user, user2 });
});

//     describe('user', () => {
//         it('is following', async () => {
//             const token = await request(server)
//                 .post('/graphql')
//                 .send({
//                     query: /* GraphQL */ `
//                         mutation {
//                             loginUser(
//                                 data: { email: "alice@conduit.com", password: "123" }
//                             ) {
//                                 token
//                             }
//                         }
//                     `,
//                 })
//                 .expect(200)
//                 .then(response => response.body.data.loginUser.token);

//             const result = await request(server)
//                 .post('/graphql')
//                 .auth(token, { type: 'bearer' })
//                 .send({
//                     query: /* GraphQL */ `
//                         query {
//                             user(where: { name: "bob" }) {
//                                 name
//                                 following {
//                                     name
//                                     isFollowing
//                                 }
//                                 followers {
//                                     name
//                                     isFollowing
//                                 }
//                                 isFollowing
//                             }
//                         }
//                     `,
//                 })
//                 .expect(200)
//                 .then(response => response.body.data.user);
//             expect(result.following).toEqual([
//                 { name: 'root', isFollowing: true },
//                 { name: 'alice', isFollowing: false },
//             ]);
//             expect(result.isFollowing).toBe(true);
//         });

//         describe('create user', () => {
//             it('bad request', async () => {
//                 const result = await request(server)
//                     .post('/graphql')
//                     .send({
//                         query: /* GraphQL */ `
//                             mutation {
//                                 createUser(
//                                     data: { name: "x", email: "", password: "123" }
//                                 ) {
//                                     userId
//                                 }
//                             }
//                         `,
//                     })
//                     .then(response => response.body);
//                 expect(result.data).toBeNull();
//                 expect(result.errors[0]).toEqual(
//                     expect.objectContaining({
//                         message: 'Invalid Field Values',
//                         extensions: expect.objectContaining({
//                             data: expect.objectContaining({
//                                 statusCode: 400,
//                                 error: 'Bad Request',
//                             }),
//                         }),
//                     }),
//                 );
//             });
//         });
//     });
