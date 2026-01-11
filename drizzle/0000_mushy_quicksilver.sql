CREATE TYPE "public"."provider_type" AS ENUM('s3-compatible', 'supabase-storage');--> statement-breakpoint
CREATE TYPE "public"."s3_variant" AS ENUM('aws-s3', 'aliyun-oss', 'tencent-cos', 'cloudflare-r2', 'minio', 'backblaze-b2');--> statement-breakpoint
CREATE TABLE "providers" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"type" "provider_type" NOT NULL,
	"variant" "s3_variant",
	"access_key_id" text,
	"secret_access_key" text,
	"region" text,
	"endpoint" text,
	"bucket" text,
	"account_id" text,
	"project_url" text,
	"anon_key" text,
	"service_role_key" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
