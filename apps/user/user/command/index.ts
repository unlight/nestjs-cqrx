import { RegisterUserHandler } from './register-user.command';
import { UpdateEmailHandler } from './update-email.command';
export { UpdateEmail } from './update-email.command';

export { RegisterUser } from './register-user.command';

export const COMMAND_HANDLERS = [RegisterUserHandler, UpdateEmailHandler];
