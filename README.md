# nestjs-cqrx

EventStoreDB NestJS CQRS module.

## Based On

-   https://github.com/nordfjord/nestjs-cqrs-es
-   https://github.com/cqrx/cqrx

## Features

-   Asynchronous commit/publish
-   Event handler decorator

## Example apps pros/cons

#### example / example-tick-tack-toe-cqrx

[+] good option (save event to db, subscribe to event from db)  
[–] synchronous (we must wait when event will be saved then reply to client)

#### [nest-cqrs-example](https://github.com/kamilmysliwiec/nest-cqrs-example)

[+] official nestjs/cqrs implementation, command handlers (fire new command via saga)  
[+] faster, we reply processing to client, and do command on  
[–] can emit only 1 event from saga

## Similar Projects

-   https://github.com/cqrx/cqrx
-   https://github.com/nordfjord/nestjs-cqrs-es

## Development

-   http://localhost:2113/web/index.html#/dashboard

## Resouces

-   https://github.com/bradsheppard/nestjs-async-cqrs
-   https://github.com/valueadd-poland/nestjs-packages/tree/master/packages/typed-cqrs
-   https://github.com/ArkerLabs/event-sourcing-nestjs
-   https://github.com/amehat?tab=repositories&q=cqrs
-   https://github.com/orhanveli/nestjs-saga-pattern-example
-   https://github.com/tuanitpro/nestjs-sagas-cqrs
-   https://github.com/ntxinh/nestjs-cqrs-es
-   https://github.com/ArkerLabs/event-sourcing-nestjs-graphql-example

## Todo

-   find lib for create errors
