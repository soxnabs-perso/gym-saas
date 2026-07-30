import { object, string, number } from 'yup';

/**
 * yup's built-in `.trim()` and `.lowercase()` call String methods on whatever
 * value arrives, so an injected object or array throws a TypeError and
 * surfaces as a 500 rather than a validation failure.
 *
 * These helpers normalise only actual strings; anything else falls through
 * untouched to the type check and comes back as a clean 400.
 */
export const trimmedString = () =>
  string().transform((value) => (typeof value === 'string' ? value.trim() : value));

export const emailString = () =>
  string()
    .transform((value) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
    .email('Email is invalid');

/**
 * Person names, shared by the gym manager signing up and the customers they add so both are held to the same rule.
 */
export const personName = () =>
  trimmedString()
    .matches(/^[\p{L}\s]+$/u, 'Only letters and spaces are allowed for names')
    .min(2, 'Name must be at least 2 characters long')
    .max(70, 'Name must be at most 70 characters long');

/**
 * A 24 character hex string. Validating this up front turns what would be a Mongoose CastError into a clean 400.
 */
const objectIdBase = string().matches(/^[0-9a-fA-F]{24}$/, 'Must be a valid id');

export const objectId = objectIdBase.required();
export const optionalObjectId = objectIdBase.optional();

export const idParamSchema = object({ id: objectId }).noUnknown();

/** Blank strings from HTML forms should read as "not provided", not as "". */
export const emptyStringToUndefined = (schema) =>
  schema.transform((value) => (value === '' ? undefined : value)).optional();

/**
 * Shared list controls, spread into each list schema. The ceiling on `limit`
 * is what stops a caller from asking for the entire collection at once.
 */
export const paginationFields = {
  page: number().integer().min(1).default(1),
  limit: number().integer().min(1).max(200).default(50),
};