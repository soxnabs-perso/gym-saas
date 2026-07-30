/**
 * Turns an axios error into something worth showing a user.
 *
 * A failed validation comes back as
 *   { message: 'Validation failed', errors: [{ field, message }] }
 * and the top-level message on its own says nothing about what to fix, so the
 * per-field messages are what actually get displayed.
 *
 * Returns `messages` for a banner and `fields` for placing each message under
 * its own input.
 */
export function describeApiError(error, fallback = 'Something went wrong, please try again') {
  const data = error?.response?.data;

  if (Array.isArray(data?.errors) && data.errors.length > 0) {
    const fields = {};
    for (const item of data.errors) {
      if (item?.field && item.field !== 'body' && !fields[item.field]) {
        fields[item.field] = item.message;
      }
    }

    // Deduplicated: two rules on one field can report the same wording, and
    // showing an identical bullet twice looks like a bug.
    const messages = [...new Set(data.errors.map((item) => item.message).filter(Boolean))];

    return { messages, fields };
  }

  // No network response at all: the server is unreachable rather than unhappy.
  if (error?.request && !error.response) {
    return { messages: ['Could not reach the server. Check your connection and try again.'], fields: {} };
  }

  return { messages: [data?.message || fallback], fields: {} };
}

export default describeApiError;
