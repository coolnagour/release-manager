import { relations, sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { applications } from "./applications";
import { releaseConditions } from "./release-conditions";

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

export const conditionsRelations = relations(conditions, ({ one, many }) => ({
    application: one(applications, {
        fields: [conditions.applicationId],
        references: [applications.id],
    }),
    releaseConditions: many(releaseConditions),
}));

export type Condition = typeof conditions.$inferSelect;
