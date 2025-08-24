CREATE TABLE IF NOT EXISTS "drivers" (
	"id" text PRIMARY KEY NOT NULL,
	"application_id" text NOT NULL,
	"created_at" timestamp NOT NULL,
	"country" text NOT NULL,
	"company_id" integer NOT NULL,
	"driver_id" integer NOT NULL,
	"vehicle_id" integer NOT NULL,
	"company_ref" text,
	"driver_ref" text,
	"vehicle_ref" text,
	"version_name" text NOT NULL,
	"version_code" integer NOT NULL
);
