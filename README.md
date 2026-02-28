# cqrx

Monorepo for cqrx modules, containing example apps and core libraries.

## Based on

- https://github.com/nordfjord/nestjs-cqrs-es
- https://github.com/cqrx/cqrx

## Features

- Asynchronous commit/publish
- Event handler decorator
- Single event for read/write

## Install

### 1. Core package

```sh
npm install --save cqrx
```

### 2. Database adapter for eventstore

Choose your adapter for eventstore

- [EventDBX](https://eventdbx.com/)
- [KurrentDB (ex- EventStoreDB)](https://www.kurrent.io/)

```sh
npm install --save eventdbx-cqrx
npm install --save kurrentdb-cqrx
```

### 3. NestJS module

```sh
npm install --save nestjs-cqrx
```

## Usage

```ts
import { CqrxModule } from 'nestjs-cqrx';

@Module({
  imports: [
    CqrxModule.forRoot({
      type: 'kurrentdb', // eventdbx
      eventstoreConnectionString: 'kurrentdb://localhost:2113?tls=false',
    }),
  ],
})
export class AppModule {}
```

#### Example of User model

```ts
import { ConflictException } from '@nestjs/common';
import { AggregateRoot, EventHandler } from 'cqrx-core';

import { UserRegistered } from '../events';

export class User extends AggregateRoot {
  protected static readonly streamName: string = 'user';
  isRegistered = false;
  email!: string;
  password!: string;

  @EventHandler(UserRegistered)
  createUser(event: UserRegistered): void {
    // Called when populating state from database and when saving
    this.isRegistered = true;
    this.email = event.data.email;
    this.password = event.data.password;
  }

  register(email: string, password: string) {
    // Business logic
    if (this.isRegistered) {
      throw new ConflictException();
    }

    this.apply(
      new UserRegistered({
        email,
        password,
      }),
    );
  }
}
```

#### Example of usage

```ts
const user = new User('123');
user.apply(new UserRegistered({ data }));
await userAggregateRepository.save(user);
user.isRegistered; // true
```

#### Example of events

```ts
import { Event } from 'cqrx-core';

type UserRegisteredDto = { email: string; password: string };

export class UserRegistered extends Event<UserRegisteredDto> {}
```

```ts
@Module({
  imports: [
    CqrxModule.forFeature(
      [User],
      // Subscribe and transform events from eventstore to domain event
      [['UserRegistered', event => new UserRegistered(event.data)]],
      // [UserRegistered]
      // Shorthand version of above
      // ['UserRegistered', event => Object.assign(new UserRegistered(), event)]
    ),
  ],
})
export class UserModule {}
```

```ts
// Signature of transformers
type Transformer = [
  /* Recorded event type */ string,
  /* Function which accept stream event (plain object) */ (
    event: IStoredEvent,
  ) => Event,
];
```

Note: If you have decorator `EventsHandler` (from `@nestjs/cqrs`) of some event,
it will be automatically added to transform service.

## Example apps pros/cons

#### example / example-tick-tack-toe-cqrx

[+] good option (save event to db, subscribe to event from db)  
[–] synchronous (we must wait when event will be saved then reply to client)

#### [nest-cqrs-example](https://github.com/kamilmysliwiec/nest-cqrs-example)

[+] official nestjs/cqrs implementation, command handlers (fire new command via saga)  
[+] faster, we reply processing to client, and do command on  
[–] can emit only 1 event from saga

## Similar Projects

- https://github.com/cqrx/cqrx
- https://github.com/nordfjord/nestjs-cqrs-es

## Resources

- https://github.com/bradsheppard/nestjs-async-cqrs
- https://github.com/valueadd-poland/nestjs-packages/tree/master/packages/typed-cqrs
- https://github.com/ArkerLabs/event-sourcing-nestjs
- https://github.com/amehat?tab=repositories&q=cqrs
- https://github.com/orhanveli/nestjs-saga-pattern-example
- https://github.com/tuanitpro/nestjs-sagas-cqrs
- https://github.com/ntxinh/nestjs-cqrs-es
- https://github.com/ArkerLabs/event-sourcing-nestjs-graphql-example
- https://github.com/oskardudycz/EventSourcing.JVM/tree/main/samples/event-sourcing-esdb-simple
- https://github.com/PrestaShopCorp/nestjs-geteventstore

## Development

```ps
docker compose up -d
$env:EVENTDBX_TOKEN = (docker compose exec -T eventdbx dbx token bootstrap --stdout).Trim()
```

```bash
docker compose up -d
export EVENTDBX_TOKEN=$(docker compose exec -T eventdbx dbx token bootstrap --stdout)
```

## Todo

- update readme for each package - each section - copy when build
- build/publish monorepo
- use https://github.com/poppinss/ts-exec
- get rid of swc, try to run user app with esm
- read from specific position
- find lib for creating errors
- better to split on read/write events
- reducer (similar to evolve of emmet)

## License

[MIT License](https://opensource.org/licenses/MIT) (c) 2026
