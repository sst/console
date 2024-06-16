ALTER TABLE `runner` RENAME COLUMN `image` TO `type`;--> statement-breakpoint
ALTER TABLE `runner` DROP COLUMN `architecture`;