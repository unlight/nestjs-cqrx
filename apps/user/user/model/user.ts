import { ConflictException } from '@nestjs/common';
import { AggregateRoot, EventHandler } from 'nestjs-cqrx';

import { UserRegistered } from '../events';

export class User extends AggregateRoot {
  protected static readonly streamName: string = 'user';
  isRegistered = false;
  email!: string;
  password!: string;

  @EventHandler(UserRegistered)
  createUser(event: UserRegistered): void {
    this.isRegistered = true;
    this.email = event.data.email;
    this.password = event.data.password;
  }

  /**
   * Use case
   */
  register(email: string, password: string) {
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
