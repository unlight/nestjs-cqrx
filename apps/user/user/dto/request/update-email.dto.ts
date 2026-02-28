import { IsEmail } from 'class-validator';

export class UpdateEmailDto {
  @IsEmail()
  readonly email!: string;
}
