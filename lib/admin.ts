export function getAdminIdentifiers() {
  const raw = process.env.ADMIN_IDENTIFIERS ?? '';
  return raw
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean)
    .map((x) => (x.includes('@') ? x.toLowerCase() : x));
}

export function isAdminIdentifier(identifier: string) {
  const admins = getAdminIdentifiers();
  const normalized = identifier.includes('@') ? identifier.trim().toLowerCase() : identifier.trim();
  return admins.includes(normalized);
}
