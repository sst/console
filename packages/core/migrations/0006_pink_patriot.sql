CREATE TABLE `github_repo` (
	`id` char(24) NOT NULL,
	`workspace_id` char(24) NOT NULL,
	`time_created` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`time_updated` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	`time_deleted` timestamp,
	`org_id` bigint NOT NULL,
	`repo_id` bigint NOT NULL,
	`slug` varchar(255) NOT NULL,
	CONSTRAINT `github_repo_workspace_id_id_pk` PRIMARY KEY(`workspace_id`,`id`),
	CONSTRAINT `repo` UNIQUE(`workspace_id`,`org_id`,`repo_id`)
);
--> statement-breakpoint
ALTER TABLE `github_org` RENAME COLUMN `org_slug` TO `slug`;--> statement-breakpoint
ALTER TABLE `github_org` MODIFY COLUMN `org_id` bigint NOT NULL;--> statement-breakpoint
ALTER TABLE `github_org` MODIFY COLUMN `installation_id` bigint NOT NULL;--> statement-breakpoint
ALTER TABLE `github_org` ADD `type` enum('user','org');--> statement-breakpoint
ALTER TABLE `github_repo` ADD CONSTRAINT `github_repo_workspace_id_org_id` FOREIGN KEY (`workspace_id`,`org_id`) REFERENCES `github_org`(`workspace_id`,`org_id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `github_org` DROP COLUMN `repos`;