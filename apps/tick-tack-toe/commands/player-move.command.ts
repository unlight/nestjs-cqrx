import { ICommand } from '@nestjs/cqrs';

import { PlayerMoveInput } from '../input/player-move.input.js';

export class PlayerMoveCommand implements ICommand {
  constructor(readonly input: PlayerMoveInput) {}
}
