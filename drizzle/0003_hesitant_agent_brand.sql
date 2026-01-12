CREATE TABLE "compression_presets" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"max_width" integer NOT NULL,
	"max_height" integer NOT NULL,
	"quality" integer NOT NULL,
	"format" text NOT NULL,
	"fit" text NOT NULL,
	"is_built_in" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
