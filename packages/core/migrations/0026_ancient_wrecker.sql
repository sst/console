ALTER TABLE `app_repo` ADD `last_event` json;--> statement-breakpoint
ALTER TABLE `app_repo` ADD `last_event_error` text;--> statement-breakpoint
ALTER TABLE `app_repo` ADD `time_last_event` timestamp;--> statement-breakpoint
ALTER TABLE `github_repo` DROP COLUMN `last_event`;--> statement-breakpoint
ALTER TABLE `github_repo` DROP COLUMN `time_last_event`;