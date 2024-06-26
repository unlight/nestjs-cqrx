import { NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { AggregateRepository, InjectAggregateRepository } from 'nestjs-cqrx';

import { UserDataDto } from '../dto';
import { User } from '../model';
import { GetUser } from './get-user.query';

@QueryHandler(GetUser)
export class GetUserHandler implements IQueryHandler<GetUser, UserDataDto> {
  constructor(
    @InjectAggregateRepository(User)
    private readonly userRepository: AggregateRepository<User>,
  ) {}

  public async execute(query: GetUser): Promise<UserDataDto> {
    const user = await this.userRepository.load(query.email);

    if (user.version === -1) {
      throw new NotFoundException();
    }

    return new UserDataDto(user.email);
  }
}
