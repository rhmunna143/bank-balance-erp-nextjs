/**
 * Recursively serializes Prisma objects so they can safely be passed from
 * Server Actions / Server Components to Client Components.
 *
 * Prisma returns `Decimal` and `Date` objects which are NOT plain objects and
 * will throw "Only plain objects can be passed to Client Components" in Next.js.
 *
 * This utility converts:
 *   - Decimal  → number
 *   - Date     → ISO string
 *   - Arrays   → recursively serialized arrays
 *   - Objects  → recursively serialized plain objects
 *   - null / primitives → as-is
 */
export function serialize<T>(value: T): any {
  if (value === null || value === undefined) return value;

  // Prisma Decimal has a `toNumber()` method
  if (
    typeof value === 'object' &&
    !Array.isArray(value) &&
    typeof (value as any).toNumber === 'function'
  ) {
    return (value as any).toNumber();
  }

  // Date → ISO string
  if (value instanceof Date) {
    return value.toISOString();
  }

  // Array
  if (Array.isArray(value)) {
    return value.map(serialize);
  }

  // Plain object — recurse
  if (typeof value === 'object') {
    const result: Record<string, any> = {};
    for (const [key, val] of Object.entries(value as object)) {
      result[key] = serialize(val);
    }
    return result;
  }

  return value;
}
