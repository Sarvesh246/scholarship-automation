/**
 * Dev-only: log when a Firestore read is executed and from where.
 * Set NEXT_PUBLIC_LOG_FIRESTORE_READS=1 to enable.
 */

const LOG_READS =
  typeof process !== "undefined" &&
  process.env.NODE_ENV === "development" &&
  (process.env.NEXT_PUBLIC_LOG_FIRESTORE_READS === "1" || process.env.NEXT_PUBLIC_LOG_FIRESTORE_READS === "true");

export function logFirestoreRead(source: string, count: number, detail?: string): void {
  if (!LOG_READS || count === 0) return;
  const msg = detail ? `[Firestore read] ${source}: ${count} docs${detail ? ` (${detail})` : ""}` : `[Firestore read] ${source}: ${count} docs`;
  console.info(msg);
}
