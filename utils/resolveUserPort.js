/**
 * Ensures a non-empty port string for alerts, rooms, and JWT.
 * Legacy users may exist without `port` in MongoDB.
 */
function resolveUserPort(user, decodedJwt = {}) {
  const fromDb = user?.port;
  if (fromDb !== undefined && fromDb !== null && String(fromDb).trim() !== '') {
    return String(fromDb).trim();
  }
  const fromJwt = decodedJwt?.port;
  if (fromJwt !== undefined && fromJwt !== null && String(fromJwt).trim() !== '') {
    return String(fromJwt).trim();
  }
  return process.env.DEFAULT_PORT_NAME || 'default';
}

module.exports = { resolveUserPort };
