/**
 * In-memory token blacklist for logout invalidation.
 *
 * Production upgrade path:
 *   Replace this Set with a Redis client using TTL equal to JWT expiry.
 *   e.g. await redis.set(token, "1", "EX", 604800); // 7 days
 *        await redis.exists(token);
 */
const blacklist = new Set();

const addToBlacklist   = (token) => blacklist.add(token);
const isBlacklisted    = (token) => blacklist.has(token);

export { addToBlacklist, isBlacklisted };
