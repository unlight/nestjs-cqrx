import { ICommand } from '@nestjs/cqrs';

export class StartGameCommand implements ICommand {
  constructor(readonly id: string) {}
}
