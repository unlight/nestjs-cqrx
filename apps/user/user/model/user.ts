import { ConflictException } from '@nestjs/common';
import { AggregateRoot, EventHandler } from 'cqrx';

import { EmailUpdated, UserRegistered } from '../events';
import { isEmail } from 'class-validator';

export class User extends AggregateRoot {
  protected static readonly aggregateType: string = 'user';
  isRegistered = false;
  email!: string;
  password!: string;

  /**
   * Event handler function will be called on aggregate load events from database
   */
  @EventHandler(UserRegistered)
  createUser(event: UserRegistered): void {
    this.isRegistered = true;
    this.email = event.data.email;
    this.password = event.data.password;
  }

  @EventHandler(EmailUpdated)
  emailUpdated(event: EmailUpdated) {
    this.email = event.data;
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

  updateEmail(email: string) {
    if (!isEmail(email)) throw new Error('Invalid email');

    this.apply(new EmailUpdated(email));
  }
}
