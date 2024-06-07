ALTER TABLE `github_repo` ADD `github_org_id` char(24) NOT NULL;--> statement-breakpoint
ALTER TABLE `github_repo` ADD CONSTRAINT `unique_repo_id` UNIQUE(`workspace_id`,`github_org_id`,`repo_id`);--> statement-breakpoint
ALTER TABLE `github_repo` ADD CONSTRAINT `fk_github_org_id` FOREIGN KEY (`workspace_id`,`github_org_id`) REFERENCES `github_org`(`workspace_id`,`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `github_repo` DROP COLUMN `org_id`;
