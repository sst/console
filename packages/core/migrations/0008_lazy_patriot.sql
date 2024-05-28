ALTER TABLE `run` RENAME COLUMN `detail` TO `log`;--> statement-breakpoint
ALTER TABLE `run` ADD `git_context` json NOT NULL;