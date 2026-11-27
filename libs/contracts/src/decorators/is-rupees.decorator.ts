import { rupeesToPaise } from '@app/common';
import { buildMessage, ValidateBy, type ValidationOptions } from 'class-validator';
import { MAX_AMOUNT_RUPEES } from '../constants.js';

/**
 * True for an amount the consumer can turn into paise without losing anything:
 * a finite number from 0 to MAX_AMOUNT_RUPEES with at most 2 decimals.
 *
 * Stricter than `@IsNumber({ maxDecimalPlaces: 2 })`, which lets 1e-7 through
 * because JavaScript prints it without a decimal point.
 */
export function isRupees(value: unknown): boolean {
  if (typeof value !== 'number' || !(value >= 0 && value <= MAX_AMOUNT_RUPEES)) {
    return false;
  }
  try {
    rupeesToPaise(value);
    return true;
  } catch {
    return false;
  }
}

/** A money amount in rupees, as a JSON number (see isRupees). */
export function IsRupees(validationOptions?: ValidationOptions): PropertyDecorator {
  return ValidateBy(
    {
      name: 'isRupees',
      validator: {
        validate: (value) => isRupees(value),
        defaultMessage: buildMessage(
          (each) =>
            `${each}$property must be an amount in rupees from 0 to ${MAX_AMOUNT_RUPEES} with at most 2 decimals`,
          validationOptions,
        ),
      },
    },
    validationOptions,
  );
}
