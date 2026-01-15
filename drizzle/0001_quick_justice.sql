ALTER TABLE "upload_history" ADD COLUMN "status" text DEFAULT 'completed' NOT NULL;--> statement-breakpoint
ALTER TABLE "upload_history" ADD COLUMN "error_message" text;