import { ConflictException } from '@nestjs/common';
import { AggregateRoot, EventHandler } from 'nestjs-cqrx';

import { UserRegistered } from '../events';

export class User extends AggregateRoot {
    isRegistered = false;
    email!: string;
    password!: string;

    @EventHandler(UserRegistered)
    createUser(event: UserRegistered): void {
        this.isRegistered = true;
        this.email = event.data.email;
        this.password = event.data.password;
    }

    async register(email: string, password: string): Promise<void> {
        if (this.isRegistered) {
            throw new ConflictException();
        }

        await this.apply(
            new UserRegistered({
                email,
                password,
            }),
        );
    }
}
