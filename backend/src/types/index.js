/**
 * Shared JSDoc typedefs for the API payloads that cross module boundaries.
 * This is a plain CommonJS project, so these are documentation only — editors
 * pick them up for autocomplete, nothing is enforced at runtime.
 *
 * @typedef {Object} SessionUser
 * @property {string} id
 * @property {string} gymName
 * @property {string} fullName
 * @property {string} email
 *
 * @typedef {Object} SessionResponse
 * @property {string} accessToken
 * @property {SessionUser} user
 *
 * @typedef {'monthly' | 'quarterly' | 'annual' | 'pay_as_you_go'} MembershipPlan
 * @typedef {'active' | 'paused' | 'cancelled'} MembershipStatus
 * @typedef {'pending' | 'paid' | 'overdue' | 'cancelled'} InvoiceStatus
 *
 * @typedef {Object} DashboardSummary
 * @property {number} totalCustomers
 * @property {number} revenueThisMonth
 * @property {number} outstandingAmount
 * @property {number} outstandingCount
 */

export {};
