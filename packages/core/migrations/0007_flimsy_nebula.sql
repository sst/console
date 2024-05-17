ALTER TABLE `github_repo` RENAME COLUMN `slug` TO `name`;--> statement-breakpoint
ALTER TABLE `github_repo` DROP FOREIGN KEY `github_repo_workspace_id_org_id`;
--> statement-breakpoint
ALTER TABLE `github_repo` ADD CONSTRAINT `github_repo_workspace_id_org_id` FOREIGN KEY (`workspace_id`,`org_id`) REFERENCES `github_org`(`workspace_id`,`org_id`) ON DELETE cascade ON UPDATE no action;