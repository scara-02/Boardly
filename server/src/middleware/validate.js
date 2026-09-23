const AppError = require('../utils/AppError');

/**
 * Generic Zod validation middleware factory.
 *
 * @param {import('zod').ZodSchema} schema - Zod schema to validate against
 * @param {'body' | 'params' | 'query'} source - Which part of the request to validate
 * @returns {Function} Express middleware
 *
 * Usage:
 *   router.post('/boards', validate(createBoardSchema, 'body'), controller.create);
 */
function validate(schema, source = 'body') {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      const errors = result.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));

      return next(
        AppError.badRequest('Validation failed', 'VALIDATION_ERROR', errors)
      );
    }

    // Replace with parsed & sanitized data (strip unknown fields)
    req[source] = result.data;
    next();
  };
}

module.exports = validate;
