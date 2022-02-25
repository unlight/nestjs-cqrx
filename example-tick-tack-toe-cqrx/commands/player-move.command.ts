import { ICommand } from '@nestjs/cqrs';

import { PlayerMoveInput } from '../input/player-move.input';

export class PlayerMoveCommand implements ICommand {
    constructor(readonly input: PlayerMoveInput) {}
}
