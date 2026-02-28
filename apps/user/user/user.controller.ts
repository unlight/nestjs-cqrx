import { Body, Controller, Get, Param, Post, Sse } from '@nestjs/common';
import { CommandBus, EventBus, ofType, QueryBus } from '@nestjs/cqrs';
import { Observable } from 'rxjs';

import { RegisterUser, UpdateEmail } from './command';
import {
  RegisterUserDto,
  UpdateEmailDto,
  UserDataDto,
  UserRegisteredDto,
} from './dto';
import { GetUser } from './query';
import { UserRegistered } from './events';

@Controller('user')
export class UserController {
  constructor(
    private readonly queryBus$: QueryBus,
    private readonly commandBus$: CommandBus,
    private readonly eventBus$: EventBus,
  ) {}

  @Get('index')
  index() {
    return { index: 'yes' };
  }

  @Get(':email')
  public async getUser(@Param('email') email: string): Promise<UserDataDto> {
    return this.queryBus$.execute(new GetUser(email));
  }

  @Post('register')
  async register(@Body() data: RegisterUserDto): Promise<UserRegisteredDto> {
    return this.commandBus$.execute(new RegisterUser(data));
  }

  @Post(':userId/updateEmail')
  async updateEmail(
    @Param('userId') userId: string,
    @Body() data: UpdateEmailDto,
  ): Promise<void> {
    const { email } = data;
    await this.commandBus$.execute(new UpdateEmail(userId, email));
  }

  @Sse('registrations')
  public getRegistrations$(): Observable<{ data: UserRegisteredDto }> {
    return this.eventBus$.pipe(ofType(UserRegistered));
  }
}
