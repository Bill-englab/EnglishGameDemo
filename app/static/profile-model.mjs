export function normalizeNickname(value) {
  if (typeof value !== 'string' || /\p{C}/u.test(value)) {
    throw new Error('Please use a nickname without control characters.');
  }
  const normalized = value.trim();
  if ([...normalized].length > 24) throw new Error('Please use 24 characters or fewer.');
  return normalized;
}
