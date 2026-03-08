import { Module } from '@nestjs/common';
import { CqrxModule } from 'nestjs-cqrx';

import { User } from './model/user.js';
import { GetUserHandler } from './query/get-user.query.js';
import { UserController } from './user.controller.ts';
import { UpdateEmailHandler } from './command/update-email.command.js';
import { RegisterUserHandler } from './command/register-user.command.js';
import { UserRegistered } from './events/user-registered.event.js';
import { EmailUpdated } from './events/email-updated.event.js';

@Module({
  imports: [
    CqrxModule.forFeature(
      [User],
      [UserRegistered, EmailUpdated], // Not necessary
      // [['UserRegistered', event => new UserRegistered(event)]],
    ),
  ],
  providers: [GetUserHandler, UpdateEmailHandler, RegisterUserHandler],
  controllers: [UserController],
})
export class UserModule {}
