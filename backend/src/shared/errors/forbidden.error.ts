import { AppError } from './app-error';

export class ForbiddenError extends AppError {
  constructor(
    message: string = 'You do not have permission to perform this action',
  ) {
    super(message, 403, 'FORBIDDEN');
  }
}
