import { type ArgumentMetadata, Injectable, type PipeTransform } from '@nestjs/common';
import { isUUID } from 'class-validator';
import { InvalidIdException } from '../exceptions/invalid-id.exception.js';

/**
 * Checks that a path parameter is a UUID: `@Param('id', ParseIdPipe) id: string`.
 * Use it instead of Nest's ParseUUIDPipe, so a bad ID fails with the catalog
 * code INVALID_ID rather than a generic BAD_REQUEST.
 */
@Injectable()
export class ParseIdPipe implements PipeTransform<unknown, string> {
  public transform(value: unknown, { data }: ArgumentMetadata): string {
    if (typeof value !== 'string' || !isUUID(value)) {
      throw new InvalidIdException(data ?? 'id');
    }
    return value;
  }
}
