ALTER TABLE `run` RENAME COLUMN `time_finished` TO `time_completed`;--> statement-breakpoint
ALTER TABLE `run` MODIFY COLUMN `error` enum('init_cannot_assume','timeout','unknown');--> statement-breakpoint
ALTER TABLE `run` ADD `time_started` timestamp;--> statement-breakpoint
ALTER TABLE `run` ADD `detail` json;