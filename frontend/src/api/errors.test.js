import { describe, it, expect } from 'vitest';
import { describeApiError } from './errors';

function apiError(status, data) {
  return { response: { status, data }, request: {} };
}

describe('describeApiError', () => {
  it('replaces the generic message with the per-field ones', () => {
    const { messages } = describeApiError(
      apiError(400, {
        message: 'Validation failed',
        errors: [
          { field: 'gymName', message: 'Gym name is required' },
          { field: 'email', message: 'Email is invalid' },
        ],
      })
    );

    expect(messages).toEqual(['Gym name is required', 'Email is invalid']);
    expect(messages).not.toContain('Validation failed');
  });

  it('maps each message to its field for inline display', () => {
    const { fields } = describeApiError(
      apiError(400, {
        message: 'Validation failed',
        errors: [
          { field: 'phone', message: 'Phone number is required' },
          { field: 'subscriptionFee', message: 'Subscription fee is required for this plan' },
        ],
      })
    );

    expect(fields).toEqual({
      phone: 'Phone number is required',
      subscriptionFee: 'Subscription fee is required for this plan',
    });
  });

  it('keeps a body-level error in the banner but not against an input', () => {
    const { messages, fields } = describeApiError(
      apiError(400, {
        message: 'Validation failed',
        errors: [{ field: 'body', message: 'Unrecognized key: "isAdmin"' }],
      })
    );

    expect(messages).toEqual(['Unrecognized key: "isAdmin"']);
    expect(fields).toEqual({});
  });

  it('keeps the first message when one field reports twice', () => {
    const { fields } = describeApiError(
      apiError(400, {
        message: 'Validation failed',
        errors: [
          { field: 'email', message: 'Email is invalid' },
          { field: 'email', message: 'Email is required' },
        ],
      })
    );

    expect(fields.email).toBe('Email is invalid');
  });

  it('does not repeat an identical message twice in the banner', () => {
    const { messages } = describeApiError(
      apiError(400, {
        message: 'Validation failed',
        errors: [
          { field: 'fullName', message: 'Only letters and spaces are allowed for names' },
          { field: 'phone', message: 'Only letters and spaces are allowed for names' },
        ],
      })
    );

    expect(messages).toHaveLength(1);
  });

  it('passes a plain error message straight through', () => {
    const { messages } = describeApiError(apiError(404, { message: 'Customer not found' }));
    expect(messages).toEqual(['Customer not found']);
  });

  it('reports a conflict in the words the API used', () => {
    const { messages } = describeApiError(apiError(409, { message: 'That email is already in use' }));
    expect(messages[0]).toBe('That email is already in use');
    expect(messages[0]).not.toContain('owner');
  });

  it('explains an unreachable server rather than showing a transport error', () => {
    const { messages } = describeApiError({ request: {}, message: 'Network Error' });
    expect(messages[0]).toMatch(/could not reach the server/i);
  });

  it('falls back to the caller-supplied wording when there is nothing else', () => {
    const { messages } = describeApiError({}, 'Could not save this customer');
    expect(messages).toEqual(['Could not save this customer']);
  });

  it('ignores an empty errors array and uses the message', () => {
    const { messages } = describeApiError(apiError(400, { message: 'Validation failed', errors: [] }));
    expect(messages).toEqual(['Validation failed']);
  });
});
