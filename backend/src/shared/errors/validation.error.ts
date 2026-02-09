import { AppError } from './app-error';

export interface FieldError {
  field: string;
  message: string;
  value?: unknown;
}

export class ValidationError extends AppError {
  public readonly fieldErrors: FieldError[];

  constructor(
    message: string = 'Validation failed',
    fieldErrors: FieldError[] = [],
  ) {
    super(message, 400, 'VALIDATION_ERROR');
    this.fieldErrors = fieldErrors;
  }

  /**
   * Convenience factory: create a ValidationError for a single field.
   */
  public static forField(
    field: string,
    message: string,
    value?: unknown,
  ): ValidationError {
    return new ValidationError('Validation failed', [
      { field, message, value },
    ]);
  }

  /**
   * Convenience factory: create a ValidationError from a map of field messages.
   */
  public static forFields(
    errors: Record<string, string>,
  ): ValidationError {
    const fieldErrors: FieldError[] = Object.entries(errors).map(
      ([field, message]) => ({ field, message }),
    );
    return new ValidationError('Validation failed', fieldErrors);
  }

  public override toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      fieldErrors: this.fieldErrors,
    };
  }
}
