import { z } from 'zod';

/**
 * A 24 character hex string. Validating this up front turns what would be a
 * Mongoose CastError (surfacing as a 500) into a clean 400.
 */
export const objectId = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, 'Must be a valid id');

export const idParamSchema = z.object({ id: objectId }).strict();

/** Blank strings from HTML forms should read as "not provided", not as "". */
export const emptyStringToUndefined = (schema) =>
  z.preprocess((value) => (value === '' ? undefined : value), schema);

/**
 * Shared list controls. The ceiling on `limit` is what stops a caller from
 * asking for the entire collection in one request.
 */
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});
