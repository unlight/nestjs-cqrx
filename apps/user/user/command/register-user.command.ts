import {
  CommandHandler,
  EventBus,
  EventPublisher,
  ICommandHandler,
} from '@nestjs/cqrs';
import { InjectAggregateRepository } from 'nestjs-cqrx';

import { AggregateRepository, EventStoreService } from 'cqrx';

import { UserRegisteredDto } from '../dto';
import { User } from '../model';
import { createId } from '@paralleldrive/cuid2';

import { RegisterUserDto } from '../dto';

export class RegisterUser {
  constructor(public readonly data: RegisterUserDto) {}
}

@CommandHandler(RegisterUser)
export class RegisterUserHandler implements ICommandHandler<RegisterUser> {
  constructor(
    @InjectAggregateRepository(User)
    private readonly userRepository: AggregateRepository<User>,
    private readonly eventBus: EventBus,
    private readonly eventStore: EventStoreService,
    private readonly publisher: EventPublisher,
  ) {}

  // Option 1. cqrs example style (without aggregate repository)
  async execute(command: RegisterUser): Promise<UserRegisteredDto> {
    const user = new User(createId());
    const { email, password } = command.data;
    user.register(email, password);

    await this.userRepository.save(user);
    // TODO: Update projection?
    return new UserRegisteredDto(user.email, user.password);
  }
}
