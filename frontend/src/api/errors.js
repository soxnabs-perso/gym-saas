/**
 * Turns an axios error into something worth showing a user.
 * A failed validation comes back as { message: 'Validation failed', errors: [{ field, message }] }
 * and the top-level message on its own says nothing about what to fix so the per-field messages are what actually get 
 * displayed. Returns `messages` for a banner and `fields` for placing each message under its own input.
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

    const messages = [...new Set(data.errors.map((item) => item.message).filter(Boolean))];

    return { messages, fields };
  }

  if (error?.request && !error.response) {
    return { messages: ['Could not reach the server. Check your connection and try again.'], fields: {} };
  }

  return { messages: [data?.message || fallback], fields: {} };
}

export default describeApiError;
