import { type ArgumentMetadata, Injectable, type PipeTransform } from '@nestjs/common';

/** Fields that are never trimmed, because spaces in them can be intentional. */
const NEVER_TRIMMED = new Set(['password']);

/**
 * Trims leading and trailing spaces from every string in request bodies and
 * query strings, at any depth. It runs before the ValidationPipe, so a name of
 * "   " fails a length check just like an empty string does.
 */
@Injectable()
export class TrimStringsPipe implements PipeTransform {
  public transform(value: unknown, metadata: ArgumentMetadata): unknown {
    return metadata.type === 'body' || metadata.type === 'query' ? trimDeep(value) : value;
  }
}

function trimDeep(value: unknown): unknown {
  if (typeof value === 'string') {
    return value.trim();
  }
  if (Array.isArray(value)) {
    return value.map(trimDeep);
  }
  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        NEVER_TRIMMED.has(key) ? item : trimDeep(item),
      ]),
    );
  }
  return value;
}

/** Plain JSON objects only; query objects from Node have a null prototype. */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const prototype: unknown = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}
