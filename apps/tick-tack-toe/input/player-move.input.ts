import { IsNumber, IsString } from 'class-validator';

export class PlayerMoveInput {
  @IsString()
  gameId!: string;

  @IsString()
  playerId!: string;

  @IsNumber()
  position!: number;
}
