import { ICommand } from '@nestjs/cqrs';

export class CheckGameEndCommand implements ICommand {
    constructor(readonly id: string) {}
}
