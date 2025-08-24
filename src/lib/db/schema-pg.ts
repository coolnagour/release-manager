
import {
  pgTable,
  text,
  timestamp,
  integer,
  jsonb,
  primaryKey,
  boolean,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { Role } from '@/types/roles';

// PostgreSQL schema for Supabase
export const users = pgTable('users', {
  uid: text('uid').primaryKey(),
  email: text('email'),
  displayName: text('display_name'),
  photoUrl: text('photo_url'),
  isSuperAdmin: boolean('is_super_admin').notNull().default(false),
  createdAt: timestamp('created_at').notNull(),
});

export const applications = pgTable('applications', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  packageName: text('package_name').notNull(),
  ownerId: text('owner_id').notNull(),
  createdAt: timestamp('created_at').notNull(),
});

export const applicationUsers = pgTable('application_users', {
  applicationId: text('application_id').notNull(),
  userId: text('user_id').notNull(),
  role: text('role').$type<Role>().notNull().default(Role.USER),
}, (table) => ({
  pk: primaryKey({ columns: [table.applicationId, table.userId] })
}));

export const conditions = pgTable('conditions', {
  id: text('id').primaryKey(),
  applicationId: text('application_id').notNull(),
  name: text('name').notNull(),
  countries: jsonb('countries').$type<string[]>(),
  companies: jsonb('companies').$type<number[]>(),
  drivers: jsonb('drivers').$type<string[]>(),
  vehicles: jsonb('vehicles').$type<string[]>(),
  createdAt: timestamp('created_at').notNull(),
});

export const releases = pgTable('releases', {
  id: text('id').primaryKey(),
  applicationId: text('application_id').notNull(),
  versionName: text('version_name').notNull(),
  versionCode: integer('version_code').notNull(),
  status: text('status').notNull(),
  createdAt: timestamp('created_at').notNull(),
});

export const releaseConditions = pgTable('release_conditions', {
  releaseId: text('release_id').notNull(),
  conditionId: text('condition_id').notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.releaseId, table.conditionId] })
}));

export const driversTable = pgTable('drivers', {
  id: text('id').primaryKey(),
  applicationId: text('application_id').notNull(),
  createdAt: timestamp('created_at').notNull(),
  country: text('country').notNull(),
  companyId: integer('company_id').notNull(),
  driverId: integer('driver_id').notNull(),
  vehicleId: integer('vehicle_id').notNull(),
  companyRef: text('company_ref'),
  driverRef: text('driver_ref'),
  vehicleRef: text('vehicle_ref'),
  versionName: text('version_name').notNull(),
  versionCode: integer('version_code').notNull(),
});


// Relations
export const usersRelations = relations(users, ({ many }) => ({
  applications: many(applicationUsers),
}));

export const applicationsRelations = relations(applications, ({ many, one }) => ({
  owner: one(users, { fields: [applications.ownerId], references: [users.uid] }),
  users: many(applicationUsers),
  conditions: many(conditions),
  releases: many(releases),
  driverLogs: many(driversTable),
}));

export const applicationUsersRelations = relations(applicationUsers, ({ one }) => ({
  application: one(applications, {
    fields: [applicationUsers.applicationId],
    references: [applications.id]
  }),
  user: one(users, {
    fields: [applicationUsers.userId],
    references: [users.uid]
  }),
}));

export const conditionsRelations = relations(conditions, ({ one, many }) => ({
  application: one(applications, {
    fields: [conditions.applicationId],
    references: [applications.id]
  }),
  releaseConditions: many(releaseConditions),
}));

export const releasesRelations = relations(releases, ({ one, many }) => ({
  application: one(applications, {
    fields: [releases.applicationId],
    references: [applications.id]
  }),
  releaseConditions: many(releaseConditions),
}));

export const releaseConditionsRelations = relations(releaseConditions, ({ one }) => ({
  release: one(releases, {
    fields: [releaseConditions.releaseId],
    references: [releases.id]
  }),
  condition: one(conditions, {
    fields: [releaseConditions.conditionId],
    references: [conditions.id]
  }),
}));

export const driversRelations = relations(driversTable, ({ one }) => ({
  application: one(applications, {
    fields: [driversTable.applicationId],
    references: [applications.id]
  }),
}));


export const pgSchema = {
  users,
  applications,
  applicationUsers,
  conditions,
  releases,
  releaseConditions,
  drivers: driversTable,
  usersRelations,
  applicationsRelations,
  applicationUsersRelations,
  conditionsRelations,
  releasesRelations,
  releaseConditionsRelations,
  driversRelations,
};
