function parsePagination(query, options = {}) {
  const defaultLimit = options.defaultLimit ?? 100;
  const maxLimit = options.maxLimit ?? 100;

  const rawLimit = Number.parseInt(query?.limit, 10);
  const rawOffset = Number.parseInt(query?.offset, 10);

  const limit = Number.isFinite(rawLimit)
    ? Math.min(Math.max(rawLimit, 1), maxLimit)
    : defaultLimit;

  const offset = Number.isFinite(rawOffset)
    ? Math.max(rawOffset, 0)
    : 0;

  return { limit, offset };
}

module.exports = { parsePagination };
