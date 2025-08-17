import { relations, sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { users } from "./users";
import { applicationUsers } from "./application-users";
import { releases } from "./releases";
import { conditions } from "./conditions";

export const applications = sqliteTable('applications', {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    packageName: text('package_name').notNull(),
    ownerId: text('owner_id').notNull().references(() => users.uid, { onDelete: 'cascade' }),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
});


export const applicationsRelations = relations(applications, ({ one, many }) => ({
	owner: one(users, {
		fields: [applications.ownerId],
		references: [users.uid],
	}),
    applicationUsers: many(applicationUsers),
    releases: many(releases),
    conditions: many(conditions),
}));

export type Application = typeof applications.$inferSelect;
