CREATE TABLE IF NOT EXISTS "application_users" (
	"application_id" text NOT NULL,
	"user_id" text NOT NULL,
	CONSTRAINT "application_users_application_id_user_id_pk" PRIMARY KEY("application_id","user_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "applications" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"package_name" text NOT NULL,
	"owner_id" text NOT NULL,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "conditions" (
	"id" text PRIMARY KEY NOT NULL,
	"application_id" text NOT NULL,
	"name" text NOT NULL,
	"countries" jsonb,
	"companies" jsonb,
	"drivers" jsonb,
	"vehicles" jsonb,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "release_conditions" (
	"release_id" text NOT NULL,
	"condition_id" text NOT NULL,
	CONSTRAINT "release_conditions_release_id_condition_id_pk" PRIMARY KEY("release_id","condition_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "releases" (
	"id" text PRIMARY KEY NOT NULL,
	"application_id" text NOT NULL,
	"version_name" text NOT NULL,
	"version_code" integer NOT NULL,
	"status" text NOT NULL,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"uid" text PRIMARY KEY NOT NULL,
	"email" text,
	"display_name" text,
	"photo_url" text,
	"role" text NOT NULL,
	"created_at" timestamp NOT NULL
);
