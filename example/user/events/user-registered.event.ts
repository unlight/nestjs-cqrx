import { Event } from 'nestjs-cqrx';

import { UserRegisteredDto } from '../dto';

export class UserRegistered extends Event<UserRegisteredDto> {}
