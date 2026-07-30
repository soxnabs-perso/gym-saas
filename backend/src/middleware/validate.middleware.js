/**
 * Builds a middleware that checks `body`, `params` and/or `query` against the given Yup schemas before a controller 
 * ever runs.
 *
 */
function findUnknownKeys(schema, value) {
  const known = Object.keys(schema.fields ?? {});
  return Object.keys(value ?? {}).filter((key) => !known.includes(key));
}

export function validate(schemas) {
  return async (req, res, next) => {
    const validated = {};
    const errors = [];

    for (const source of ['body', 'params', 'query']) {
      const schema = schemas[source];
      if (!schema) continue;

      const input = req[source] ?? {};

      const unknown = findUnknownKeys(schema, input);
      if (unknown.length) {
        errors.push(
          ...unknown.map((key) => ({ field: key, message: `Unrecognized key: "${key}"` }))
        );
        continue;
      }

      try {
        validated[source] = await schema.validate(input, { abortEarly: false });
      } catch (err) {
        if (err.name !== 'ValidationError') throw err;

        const issues = err.inner?.length ? err.inner : [err];
        errors.push(
          ...issues.map((issue) => ({
            field: issue.path || source,
            message: issue.message,
          }))
        );
      }
    }

    if (errors.length) {
      return res.status(400).json({ message: 'Validation failed', errors });
    }

    req.validated = { ...req.validated, ...validated };
    return next();
  };
}

export default validate;
