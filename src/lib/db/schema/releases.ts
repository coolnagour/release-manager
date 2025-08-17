import { relations, sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { ReleaseStatus } from "@/types/release";
import { applications } from "./applications";
import { releaseConditions } from "./release-conditions";

export const releases = sqliteTable('releases', {
    id: text('id').primaryKey(),
    applicationId: text('application_id').notNull().references(() => applications.id, { onDelete: 'cascade' }),
    versionName: text('version_name').notNull(),
    versionCode: text('version_code').notNull(),
    status: text('status').$type<ReleaseStatus>().notNull().default(ReleaseStatus.ACTIVE),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
});

export const releasesRelations = relations(releases, ({ one, many }) => ({
    application: one(applications, {
        fields: [releases.applicationId],
        references: [applications.id],
    }),
    releaseConditions: many(releaseConditions),
}));

export type Release = typeof releases.$inferSelect;
