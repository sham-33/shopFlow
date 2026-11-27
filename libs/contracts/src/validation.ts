import { CORRELATION_ID_PATTERN, flattenValidationErrors } from '@app/common';
import { plainToInstance } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsISO8601,
  IsObject,
  IsString,
  IsUUID,
  Matches,
  Min,
  ValidateIf,
  validateSync,
  type ValidatorOptions,
} from 'class-validator';
import type { EventPayloads } from './envelope.js';
import { EventType, ServiceName } from './enums.js';
import { EVENT_DEFINITIONS } from './event-definitions.js';
import { InvalidEventError } from './invalid-event.error.js';

/**
 * Unknown fields are dropped, not rejected (the "tolerant reader" rule): a
 * producer may add a field within a version, and consumers that do not know
 * it yet must still accept its events.
 */
const VALIDATOR_OPTIONS: ValidatorOptions = {
  whitelist: true,
  forbidNonWhitelisted: false,
  forbidUnknownValues: true,
};

/** The rules for the envelope fields. The payload has its own class. */
export class EnvelopeFields {
  @IsUUID()
  public eventId: string;

  @IsEnum(EventType)
  public eventType: EventType;

  @IsInt()
  @Min(1)
  public eventVersion: number;

  @IsISO8601({ strict: true, strictSeparator: true })
  public occurredAt: string;

  @IsUUID()
  public aggregateId: string;

  @IsString()
  @Matches(CORRELATION_ID_PATTERN)
  public correlationId: string;

  // Must be present: null, or the UUID of the event that caused this one.
  @ValidateIf((_, value) => value !== null)
  @IsUUID()
  public causationId: string | null;

  @IsEnum(ServiceName)
  public producer: ServiceName;

  @IsObject()
  public payload: object;
}

/** The envelope fields of a JSON object. Throws InvalidEventError when one breaks a rule. */
export function validateEnvelope(json: object): EnvelopeFields {
  const fields = plainToInstance(EnvelopeFields, json);
  const problems = flattenValidationErrors(validateSync(fields, VALIDATOR_OPTIONS));
  if (problems.length > 0) {
    throw new InvalidEventError('The event envelope is invalid', problems);
  }
  return fields;
}

/**
 * The payload as an instance of its event's class, without unknown fields.
 * Throws InvalidEventError when it breaks a rule.
 */
export function validatePayload<T extends EventType>(
  eventType: T,
  payload: object,
): EventPayloads[T] {
  const instance = plainToInstance(EVENT_DEFINITIONS[eventType].payload, payload);
  const problems = flattenValidationErrors(validateSync(instance, VALIDATOR_OPTIONS), 'payload');
  if (problems.length > 0) {
    throw new InvalidEventError(`The ${eventType} payload is invalid`, problems);
  }
  return instance;
}
