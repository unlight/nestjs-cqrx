import {
  CommandHandler,
  EventBus,
  EventPublisher,
  ICommandHandler,
} from '@nestjs/cqrs';
import cuid from 'cuid';
import {
  AggregateRepository,
  EventStoreService,
  InjectAggregateRepository,
} from 'nestjs-cqrx';

import { UserRegisteredDto } from '../dto';
import { UserRegistered } from '../events';
import { User } from '../model';
import { RegisterUser } from './register-user.command';

@CommandHandler(RegisterUser)
export class RegisterUserHandler implements ICommandHandler<RegisterUser> {
  constructor(
    @InjectAggregateRepository(User)
    private readonly userRepository: AggregateRepository<User>,
    private readonly eventBus: EventBus,
    private readonly eventStore: EventStoreService,
    private readonly publisher: EventPublisher,
  ) {}

  // cqrs example style (without aggregate repository)
  async execute(command: RegisterUser): Promise<UserRegisteredDto> {
    const userId = cuid();
    const user = new User('user', userId);
    user.register(command.data.email, command.data.password);
    await this.userRepository.save(user);
    // TODO: Update projection
    return new UserRegisteredDto(user.email, user.password);
  }

  // async execute_x(command: RegisterUser): Promise<UserRegisteredDto> {
  //     class User extends CustomAggregateRoot {
  //         register(email: string, password: string) {
  //             this.apply(
  //                 new UserRegistered({
  //                     email,
  //                     password,
  //                 }),
  //             );
  //         }
  //     }
  //     const userId = cuid();
  //     const user = this.publisher.mergeObjectContext(new User());

  //     user.register(command.data.email, command.data.password);

  //     await this.eventStore.appendToStream({
  //         streamId: `user-${userId}`,
  //         events: user.getUncommittedEvents() as any[],
  //         expectedRevision: 'no_stream',
  //     });

  //     user.commit();
  // }

  async execute_1(command: RegisterUser): Promise<UserRegisteredDto> {
    const user = await this.userRepository.findOne(command.data.email);
    await user.register(command.data.email, command.data.password);
    await this.userRepository.save(user);

    return new UserRegisteredDto(user.email, user.password);
  }
}
