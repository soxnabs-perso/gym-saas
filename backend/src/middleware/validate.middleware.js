/**
 * Builds a middleware that checks `body`, `params` and/or `query` against the
 * given Zod schemas before a controller ever runs.
 *
 * Parsed output lands on `req.validated` rather than overwriting `req.query`,
 * which Express 4 exposes through a getter with no setter — assigning to it
 * throws in an ES module, where strict mode is always on.
 *
 * Because every schema is `.strict()`, unknown keys are rejected outright.
 * That is what keeps a crafted body such as `{ email: { $gt: '' } }` from
 * reaching a Mongoose query as an operator object.
 */
export function validate(schemas) {
  return (req, res, next) => {
    const validated = {};

    for (const source of ['body', 'params', 'query']) {
      const schema = schemas[source];
      if (!schema) continue;

      const result = schema.safeParse(req[source] ?? {});

      if (!result.success) {
        return res.status(400).json({
          message: 'Validation failed',
          errors: result.error.issues.map((issue) => ({
            field: issue.path.join('.') || source,
            message: issue.message,
          })),
        });
      }

      validated[source] = result.data;
    }

    req.validated = { ...req.validated, ...validated };
    return next();
  };
}

export default validate;
