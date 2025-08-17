
import { relations, sql } from "drizzle-orm";
import { integer, sqliteTable, text, primaryKey } from "drizzle-orm/sqlite-core";
import { Role } from "@/types/roles";
import { ReleaseStatus } from "@/types/release";

export const users = sqliteTable('users', {
  uid: text('uid').primaryKey(),
  email: text('email').unique(),
  displayName: text('display_name'),
  photoUrl: text('photo_url'),
  role: text('role').notNull().default(Role.USER),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
});

export const applications = sqliteTable('applications', {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    packageName: text('package_name').notNull(),
    ownerId: text('owner_id').notNull().references(() => users.uid, { onDelete: 'cascade' }),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
});

export const applicationUsers = sqliteTable('application_users', {
    applicationId: text('application_id').notNull().references(() => applications.id, { onDelete: 'cascade' }),
    userId: text('user_id').notNull().references(() => users.uid, { onDelete: 'cascade' }),
}, (table) => ({
    pk: primaryKey({ columns: [table.applicationId, table.userId] }),
}));

export const releases = sqliteTable('releases', {
    id: text('id').primaryKey(),
    applicationId: text('application_id').notNull().references(() => applications.id, { onDelete: 'cascade' }),
    versionName: text('version_name').notNull(),
    versionCode: text('version_code').notNull(),
    status: text('status').notNull().default(ReleaseStatus.ACTIVE),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
});

export const conditions = sqliteTable('conditions', {
    id: text('id').primaryKey(),
    applicationId: text('application_id').notNull().references(() => applications.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    rulesCountries: text('rules_countries'),
    rulesCompanyIds: text('rules_company_ids'),
    rulesDriverIds: text('rules_driver_ids'),
    rulesVehicleIds: text('rules_vehicle_ids'),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
});

export const releaseConditions = sqliteTable('release_conditions', {
    releaseId: text('release_id').notNull().references(() => releases.id, { onDelete: 'cascade' }),
    conditionId: text('condition_id').notNull().references(() => conditions.id, { onDelete: 'cascade' }),
}, (table) => ({
    pk: primaryKey({ columns: [table.releaseId, table.conditionId] }),
}));


// Relations

export const usersRelations = relations(users, ({ many }) => ({
	applications: many(applicationUsers),
}));

export const applicationsRelations = relations(applications, ({ one, many }) => ({
	owner: one(users, {
		fields: [applications.ownerId],
		references: [users.uid],
	}),
    applicationUsers: many(applicationUsers),
    releases: many(releases),
    conditions: many(conditions),
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

export const releasesRelations = relations(releases, ({ one, many }) => ({
    application: one(applications, {
        fields: [releases.applicationId],
        references: [applications.id],
    }),
    releaseConditions: many(releaseConditions),
}));

export const conditionsRelations = relations(conditions, ({ one, many }) => ({
    application: one(applications, {
        fields: [conditions.applicationId],
        references: [applications.id],
    }),
    releaseConditions: many(releaseConditions),
}));

export const releaseConditionsRelations = relations(releaseConditions, ({ one }) => ({
    release: one(releases, {
        fields: [releaseConditions.releaseId],
        references: [releases.id],
    }),
    condition: one(conditions, {
        fields: [releaseConditions.conditionId],
        references: [conditions.id],
    }),
}));

export type Application = typeof applications.$inferSelect;
export type User = typeof users.$inferSelect;
export type Condition = typeof conditions.$inferSelect;
export type Release = typeof releases.$inferSelect;
