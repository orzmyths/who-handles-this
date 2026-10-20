export function chunkArray<T>(items: T[], size: number): T[][] {
  return Array.from({ length: Math.ceil(items.length / size) }, (_value, index) =>
    items.slice(index * size, index * size + size),
  );
}

// Reject partial responses instead of quietly mixing translated safety text
// with English. Used for both UI batches and curated email instructions.
export function requireCompleteTranslation(value: unknown, expected: number): string[] {
  if (!Array.isArray(value) || value.length !== expected ||
    value.some(item => typeof item !== 'string' || !item.trim())) {
    throw new Error('Translation returned incomplete text.');
  }
  return value as string[];
}