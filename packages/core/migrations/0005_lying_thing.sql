DROP INDEX `org_id` ON `github_org`;--> statement-breakpoint
ALTER TABLE `github_org` ADD `repos` json NOT NULL;--> statement-breakpoint
CREATE INDEX `installation_id` ON `github_org` (`org_id`);