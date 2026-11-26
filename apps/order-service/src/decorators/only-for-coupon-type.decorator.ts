import { registerDecorator, type ValidationArguments } from 'class-validator';
import type { CouponType } from '../domain/enums.js';

/**
 * Fails when the field is sent with a coupon of another type, for example
 * `percentOff` on a FLAT coupon. Pair it with
 * `@ValidateIf((o) => o.type === <type> || o.<field> !== undefined)` so the
 * field's other rules also run when it is required.
 */
export function OnlyForCouponType(type: CouponType): PropertyDecorator {
  return (target: object, propertyName: string | symbol) => {
    registerDecorator({
      name: 'onlyForCouponType',
      target: target.constructor,
      propertyName: String(propertyName),
      constraints: [type],
      options: { message: `$property is only for ${type} coupons` },
      validator: {
        validate: (_value: unknown, args: ValidationArguments): boolean =>
          (args.object as { type?: unknown }).type === type,
      },
    });
  };
}
