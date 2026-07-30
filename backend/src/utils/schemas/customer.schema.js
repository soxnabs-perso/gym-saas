import { object, string, number, boolean } from 'yup';
import {
  emptyStringToUndefined,
  paginationFields,
  trimmedString,
  emailString,
  personName,
} from './common.schema.js';

export const MEMBERSHIP_PLANS = ['monthly', 'quarterly', 'annual', 'pay_as_you_go'];
export const MEMBERSHIP_STATUSES = ['active', 'paused', 'cancelled'];

/** Billed per visit rather than per cycle, so it carries no recurring fee. */
export const PAY_AS_YOU_GO = 'pay_as_you_go';

/**
 * @swagger
 * components:
 *   schemas:
 *     CustomerRequest:
 *       type: object
 *       required: [fullName, phone]
 *       properties:
 *         fullName:        { type: string, example: 'Moussa Ndiaye' }
 *         phone:           { type: string, example: '+221 77 000 00 01' }
 *         email:           { type: string, format: email, description: 'Optional' }
 *         membershipPlan:  { type: string, enum: [monthly, quarterly, annual, pay_as_you_go] }
 *         subscriptionFee:
 *           type: number
 *           minimum: 0
 *           example: 15000
 *           description: >
 *             What the member pays per cycle of their plan. Required for every
 *             plan except pay_as_you_go, which is billed per visit.
 *     Customer:
 *       type: object
 *       properties:
 *         _id:              { type: string }
 *         fullName:         { type: string }
 *         email:            { type: string }
 *         phone:            { type: string }
 *         membershipPlan:   { type: string }
 *         membershipStatus: { type: string }
 *         subscriptionFee:  { type: number }
 *         joinedAt:         { type: string, format: date-time }
 */

const optionalEmail = emptyStringToUndefined(emailString());

const subscriptionFee = number()
  .typeError('Subscription fee must be a number')
  .min(0, 'Subscription fee cannot be negative')
  .max(1_000_000_000);

export const createCustomerSchema = object({
  fullName: personName().required('Customer name is required'),
  phone: trimmedString()
    .min(1, 'Phone number is required')
    .max(40)
    .required('Phone number is required'),
  email: optionalEmail,
  membershipPlan: string().oneOf(MEMBERSHIP_PLANS).default('monthly'),
  subscriptionFee: subscriptionFee.when('membershipPlan', {
    is: (plan) => plan !== PAY_AS_YOU_GO,
    then: (schema) => schema.required('Subscription fee is required for this plan'),
    otherwise: (schema) => schema.optional(),
  }),
}).noUnknown();

export const updateCustomerSchema = object({
  fullName: personName().optional(),
  phone: trimmedString().min(1, 'Phone number is required').max(40).optional(),
  email: optionalEmail,
  membershipPlan: string().oneOf(MEMBERSHIP_PLANS).optional(),
  membershipStatus: string().oneOf(MEMBERSHIP_STATUSES).optional(),
  subscriptionFee: subscriptionFee.optional(),
})
  .noUnknown()
  .test(
    'at-least-one-field',
    'Provide at least one field to update',
    (value) => Boolean(value) && Object.keys(value).length > 0
  );

export const listCustomersQuerySchema = object({
  ...paginationFields,
  status: string().oneOf(MEMBERSHIP_STATUSES).optional(),
  search: trimmedString().max(120).optional(),
  archived: boolean().default(false),
}).noUnknown();