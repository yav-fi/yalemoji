export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function isYaleEmail(email: string) {
  return /^[^\s@]+@yale\.edu$/i.test(normalizeEmail(email));
}
