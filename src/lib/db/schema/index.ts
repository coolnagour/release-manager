import { applications, applicationsRelations } from './applications';
import { applicationUsers, applicationUsersRelations } from './application-users';
import { conditions, conditionsRelations } from './conditions';
import { releases, releasesRelations } from './releases';
import { releaseConditions, releaseConditionsRelations } from './release-conditions';
import { users, usersRelations } from './users';

// This file is the single source of truth for the database schema.
// It exports all table definitions and their relations.
// Drizzle Kit uses this file to generate migrations.
// The application uses this file to perform database queries.

export * from './applications';
export * from './application-users';
export * from './conditions';
export * from './releases';
export * from './release-conditions';
export * from './users';

export const schema = {
    applications,
    applicationUsers,
    conditions,
    releases,
    releaseConditions,
    users,
    applicationsRelations,
    applicationUsersRelations,
    conditionsRelations,
    releasesRelations,
    releaseConditionsRelations,
    usersRelations
};

export type Application = typeof applications.$inferSelect;
export type User = typeof users.$inferSelect;
export type Condition = typeof conditions.$inferSelect;
export type Release = typeof releases.$inferSelect;
