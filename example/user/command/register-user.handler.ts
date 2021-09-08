import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { AggregateRepository, InjectAggregateRepository } from 'nestjs-cqrx';

import { UserRegisteredDto } from '../dto';
import { User } from '../model';
import { RegisterUser } from './register-user.command';

@CommandHandler(RegisterUser)
export class RegisterUserHandler implements ICommandHandler<RegisterUser> {
    constructor(
        @InjectAggregateRepository(User)
        private readonly userRepository: AggregateRepository<User>,
    ) {}

    public async execute(command: RegisterUser): Promise<UserRegisteredDto> {
        const user = await this.userRepository.findOne(command.data.email);
        await user.register(command.data.email, command.data.password);
        await this.userRepository.save(user);

        return new UserRegisteredDto(user.email, user.password);
    }
}
