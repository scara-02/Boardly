/**
 * Parse pagination parameters from query string and return
 * skip/limit values plus a helper to build the pagination metadata.
 *
 * @param {Object} query - Express req.query
 * @param {number} [defaultLimit=20] - Default page size
 * @param {number} [maxLimit=100] - Maximum allowed page size
 * @returns {{ page: number, limit: number, skip: number, getMeta: (total: number) => Object }}
 */
function parsePagination(query, defaultLimit = 20, maxLimit = 100) {
  let page = parseInt(query.page, 10);
  let limit = parseInt(query.limit, 10);

  if (isNaN(page) || page < 1) page = 1;
  if (isNaN(limit) || limit < 1) limit = defaultLimit;
  if (limit > maxLimit) limit = maxLimit;

  const skip = (page - 1) * limit;

  return {
    page,
    limit,
    skip,
    getMeta(totalCount) {
      return {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasNextPage: page * limit < totalCount,
        hasPrevPage: page > 1,
      };
    },
  };
}

module.exports = { parsePagination };
