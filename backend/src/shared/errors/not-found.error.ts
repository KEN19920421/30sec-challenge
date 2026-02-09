import { AppError } from './app-error';

export class NotFoundError extends AppError {
  constructor(
    resource: string = 'Resource',
    identifier?: string | number,
  ) {
    const message = identifier
      ? `${resource} with identifier '${identifier}' was not found`
      : `${resource} not found`;

    super(message, 404, 'NOT_FOUND');
  }
}
