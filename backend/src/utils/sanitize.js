// Strip sensitive fields before sending a user object out over HTTP.
function publicUser(row) {
  if (!row) return null;
  const { password_hash, ...safe } = row;
  return safe;
}

module.exports = { publicUser };
