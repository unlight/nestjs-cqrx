import { IsEmail, IsString, Length } from 'class-validator';

export class RegisterUserDto {
  @IsEmail()
  readonly email!: string;

  @IsString()
  @Length(6, 32)
  readonly password!: string;
}
