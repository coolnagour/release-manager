import { relations, sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { applications } from "./applications";

export const drivers = sqliteTable('drivers', {
    id: text('id').primaryKey(),
    applicationId: text('application_id').notNull().references(() => applications.id, { onDelete: 'cascade' }),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
    
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

export const driversRelations = relations(drivers, ({ one }) => ({
    application: one(applications, {
        fields: [drivers.applicationId],
        references: [applications.id],
    }),
}));
