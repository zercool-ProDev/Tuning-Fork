/**
 * Database schema.
 *
 * Deliberately near-empty for now: the feature tables for the music tracker get
 * designed once the architecture is agreed. The one table here exists so that
 * the migration pipeline and the connection are provably working end to end.
 */

import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

/**
 * Key/value scratch table used by the health check to prove the app can both
 * read and write. Safe to keep around later as a place for small singletons
 * (schema version marker, last-seeded-at, and so on).
 */
export const appMeta = pgTable("app_meta", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
