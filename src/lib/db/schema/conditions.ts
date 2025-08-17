import { relations, sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { applications } from "./applications";
import { releaseConditions } from "./release-conditions";

export const conditions = sqliteTable('conditions', {
    id: text('id').primaryKey(),
    applicationId: text('application_id').notNull().references(() => applications.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    countries: text('countries', { mode: 'json' }).$type<string[]>().default([]),
    companies: text('companies', { mode: 'json' }).$type<number[]>().default([]),
    drivers: text('drivers', { mode: 'json' }).$type<string[]>().default([]),
    vehicles: text('vehicles', { mode: 'json' }).$type<string[]>().default([]),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
});

export const conditionsRelations = relations(conditions, ({ one, many }) => ({
    application: one(applications, {
        fields: [conditions.applicationId],
        references: [applications.id],
    }),
    releaseConditions: many(releaseConditions),
}));

export type Condition = typeof conditions.$inferSelect;
