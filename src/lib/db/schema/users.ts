
import { relations, sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { applicationUsers } from "./application-users";

export const users = sqliteTable('users', {
  uid: text('uid').primaryKey(),
  email: text('email').unique(),
  displayName: text('display_name'),
  photoUrl: text('photo_url'),
  isSuperAdmin: integer('is_super_admin', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
});

export const usersRelations = relations(users, ({ many }) => ({
	applications: many(applicationUsers),
}));

export type User = typeof users.$inferSelect;
