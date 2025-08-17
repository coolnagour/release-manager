import { relations } from "drizzle-orm";
import { sqliteTable, text, primaryKey } from "drizzle-orm/sqlite-core";
import { releases } from "./releases";
import { conditions } from "./conditions";

export const releaseConditions = sqliteTable('release_conditions', {
    releaseId: text('release_id').notNull().references(() => releases.id, { onDelete: 'cascade' }),
    conditionId: text('condition_id').notNull().references(() => conditions.id, { onDelete: 'cascade' }),
}, (table) => ({
    pk: primaryKey({ columns: [table.releaseId, table.conditionId] }),
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
