import {
  CommandHandler,
  EventBus,
  EventPublisher,
  ICommandHandler,
} from '@nestjs/cqrs';
import { InjectAggregateRepository } from 'nestjs-cqrx';

import { AggregateRepository, EventStoreService } from 'cqrx-core';

import { User } from '../model';

export class UpdateEmail {
  constructor(
    readonly userId: string,
    readonly email: string,
  ) {}
}

@CommandHandler(UpdateEmail)
export class UpdateEmailHandler implements ICommandHandler<UpdateEmail> {
  constructor(
    @InjectAggregateRepository(User)
    private readonly userRepository: AggregateRepository<User>,
    private readonly eventBus: EventBus,
    private readonly eventStore: EventStoreService,
    private readonly publisher: EventPublisher,
  ) {}

  async execute(command: UpdateEmail): Promise<void> {
    const { email, userId } = command;
    const user = await this.userRepository.load(userId);
    user.updateEmail(email);
    await this.userRepository.save(user);
    // TODO: Update projection?
  }
}
