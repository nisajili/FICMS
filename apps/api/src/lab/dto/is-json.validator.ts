import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'isJson', async: false })
export class IsJsonConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (value === undefined || value === null) return true;
    try {
      JSON.stringify(value);
      return true;
    } catch {
      return false;
    }
  }
  defaultMessage(): string {
    return '$property must be JSON-serialisable';
  }
}

export function IsJson(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsJsonConstraint,
    });
  };
}
