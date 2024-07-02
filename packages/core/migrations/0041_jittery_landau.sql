DROP TABLE `app_repo`;--> statement-breakpoint
DROP TABLE `github_repo`;--> statement-breakpoint
DROP TABLE `github_org`;--> statement-breakpoint
DROP TABLE `run_env`;--> statement-breakpoint
ALTER TABLE `run` MODIFY COLUMN `app_id` char(24) NOT NULL;--> statement-breakpoint
ALTER TABLE `app_repository` DROP COLUMN `last_event`;--> statement-breakpoint
ALTER TABLE `app_repository` DROP COLUMN `last_event_id`;--> statement-breakpoint
ALTER TABLE `app_repository` DROP COLUMN `last_event_status`;--> statement-breakpoint
ALTER TABLE `app_repository` DROP COLUMN `time_last_event`;