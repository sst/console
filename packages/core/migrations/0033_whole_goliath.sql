CREATE TABLE `app_repository` (
	`id` char(24) NOT NULL,
	`workspace_id` char(24) NOT NULL,
	`time_created` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`time_updated` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	`time_deleted` timestamp,
	`app_id` char(24) NOT NULL,
	`type` enum('github') NOT NULL,
	`repo_id` char(24) NOT NULL,
	`last_event` json,
	`last_event_id` char(24),
	`last_event_status` text,
	`time_last_event` timestamp,
	CONSTRAINT `app_repository_workspace_id_id_pk` PRIMARY KEY(`workspace_id`,`id`)
);
--> statement-breakpoint
CREATE TABLE `github_organization` (
	`id` char(24) NOT NULL,
	`workspace_id` char(24) NOT NULL,
	`time_created` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`time_updated` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	`time_deleted` timestamp,
	`time_disconnected` timestamp,
	`external_org_id` bigint NOT NULL,
	`login` varchar(255) NOT NULL,
	`installation_id` bigint NOT NULL,
	CONSTRAINT `github_organization_workspace_id_id_pk` PRIMARY KEY(`workspace_id`,`id`),
	CONSTRAINT `unique_external_org_id` UNIQUE(`workspace_id`,`external_org_id`)
);
--> statement-breakpoint
CREATE TABLE `github_repository` (
	`id` char(24) NOT NULL,
	`workspace_id` char(24) NOT NULL,
	`time_created` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`time_updated` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	`time_deleted` timestamp,
	`github_org_id` char(24) NOT NULL,
	`external_repo_id` bigint NOT NULL,
	`name` varchar(255) NOT NULL,
	CONSTRAINT `github_repository_workspace_id_id_pk` PRIMARY KEY(`workspace_id`,`id`),
	CONSTRAINT `unique_external_repo_id` UNIQUE(`workspace_id`,`github_org_id`,`external_repo_id`)
);
--> statement-breakpoint
ALTER TABLE `app_repository` ADD CONSTRAINT `app_repository_workspace_id_workspace_id_fk` FOREIGN KEY (`workspace_id`) REFERENCES `workspace`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `app_repository` ADD CONSTRAINT `fk_app_id` FOREIGN KEY (`workspace_id`,`app_id`) REFERENCES `app`(`workspace_id`,`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `github_organization` ADD CONSTRAINT `github_organization_workspace_id_workspace_id_fk` FOREIGN KEY (`workspace_id`) REFERENCES `workspace`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `github_repository` ADD CONSTRAINT `github_repository_workspace_id_workspace_id_fk` FOREIGN KEY (`workspace_id`) REFERENCES `workspace`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `github_repository` ADD CONSTRAINT `github_org_id_fk` FOREIGN KEY (`workspace_id`,`github_org_id`) REFERENCES `github_organization`(`workspace_id`,`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `installation_id` ON `github_organization` (`installation_id`);--> statement-breakpoint
DELETE FROM `runner`;--> statement-breakpoint
ALTER TABLE `runner` DROP FOREIGN KEY `repo_id_fk`;--> statement-breakpoint
ALTER TABLE `runner` ADD CONSTRAINT `repo_id_fk` FOREIGN KEY (`workspace_id`,`app_repo_id`) REFERENCES `app_repository`(`workspace_id`,`id`) ON DELETE cascade ON UPDATE no action;