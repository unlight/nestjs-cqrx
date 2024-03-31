import { Module } from '@nestjs/common';
import { CqrxModule, Event } from 'nestjs-cqrx';

import { COMMAND_HANDLERS } from './command';
import { UserRegistered } from './events';
import { User } from './model';
import { QUERY_HANDLERS } from './query';
import { UserController } from './user.controller';

@Module({
  imports: [
    CqrxModule.forFeature(
      [User],
      [UserRegistered],
      // [['UserRegistered', event => new UserRegistered(event)]],
    ),
  ],
  providers: [...QUERY_HANDLERS, ...COMMAND_HANDLERS],
  controllers: [UserController],
})
export class UserModule {}
