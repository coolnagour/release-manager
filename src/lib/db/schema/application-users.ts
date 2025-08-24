
import { relations } from "drizzle-orm";
import { sqliteTable, text, primaryKey } from "drizzle-orm/sqlite-core";
import { applications } from "./applications";
import { users } from "./users";
import { Role } from "@/types/roles";

export const applicationUsers = sqliteTable('application_users', {
    applicationId: text('application_id').notNull().references(() => applications.id, { onDelete: 'cascade' }),
    userId: text('user_id').notNull().references(() => users.uid, { onDelete: 'cascade' }),
    role: text('role').$type<Role>().notNull().default(Role.USER),
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
