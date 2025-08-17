import { relations } from "drizzle-orm";
import { sqliteTable, text, primaryKey } from "drizzle-orm/sqlite-core";
import { applications } from "./applications";
import { users } from "./users";

export const applicationUsers = sqliteTable('application_users', {
    applicationId: text('application_id').notNull().references(() => applications.id, { onDelete: 'cascade' }),
    userId: text('user_id').notNull().references(() => users.uid, { onDelete: 'cascade' }),
}, (table) => ({
    pk: primaryKey({ columns: [table.applicationId, table.userId] }),
}));

export const applicationUsersRelations = relations(applicationUsers, ({ one }) => ({
	application: one(applications, {
		fields: [applicationUsers.applicationId],
		references: [applications.id],
	}),
	user: one(users, {
		fields: [applicationUsers.userId],
		references: [users.uid],
	}),
}));
