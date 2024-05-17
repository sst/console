ALTER TABLE `github_org` RENAME COLUMN `slug` TO `login`;--> statement-breakpoint
ALTER TABLE `github_org` DROP COLUMN `type`;