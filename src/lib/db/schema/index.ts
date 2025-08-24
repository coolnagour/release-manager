// This file is the single source of truth for the database schema.
// It exports all table definitions and their relations.
// Drizzle Kit uses this file to generate migrations.
// The application uses this file to perform database queries.

import { users, usersRelations } from './users';
import { applications, applicationsRelations } from './applications';
import { applicationUsers, applicationUsersRelations } from './application-users';
import { conditions, conditionsRelations } from './conditions';
import { releases, releasesRelations } from './releases';
import { releaseConditions, releaseConditionsRelations } from './release-conditions';
import { drivers, driversRelations } from './drivers';

export * from './users';
export * from './applications';
export * from './application-users';
export * from './conditions';
export * from './releases';
export * from './release-conditions';
export * from './drivers';

export const schema = {
    users,
    applications,
    applicationUsers,
    conditions,
    releases,
    releaseConditions,
    drivers,
    usersRelations,
    applicationsRelations,
    applicationUsersRelations,
    conditionsRelations,
    releasesRelations,
    releaseConditionsRelations,
    driversRelations,
};
