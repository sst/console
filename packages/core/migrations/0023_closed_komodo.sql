ALTER TABLE `github_repo` DROP FOREIGN KEY `github_repo_workspace_id_org_id`;
--> statement-breakpoint
ALTER TABLE `github_repo` ADD `last_event` json;--> statement-breakpoint
ALTER TABLE `github_repo` ADD `time_last_event` timestamp;