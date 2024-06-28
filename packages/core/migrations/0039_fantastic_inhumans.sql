ALTER TABLE `run` DROP COLUMN `error`;--> statement-breakpoint
ALTER TABLE `run` ADD COLUMN `error` json;
