CREATE TABLE `run` (
	`id` char(24) NOT NULL,
	`workspace_id` char(24) NOT NULL,
	`time_created` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`time_updated` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	`time_deleted` timestamp,
	`time_finished` timestamp,
	`stage_id` char(24) NOT NULL,
	`error` enum('init_cannot_assume','timeout'),
	CONSTRAINT `run_workspace_id_id_pk` PRIMARY KEY(`workspace_id`,`id`),
	CONSTRAINT `timeCreated` UNIQUE(`workspace_id`,`stage_id`,`time_created`)
);
--> statement-breakpoint
CREATE TABLE `run_runner` (
	`id` char(24) NOT NULL,
	`workspace_id` char(24) NOT NULL,
	`time_created` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`time_updated` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	`time_deleted` timestamp,
	`aws_account_id` varchar(12) NOT NULL,
	`region` varchar(255) NOT NULL,
	`name` enum('lambda/x86_64','lambda/arm64') NOT NULL,
	`resource` json NOT NULL,
	CONSTRAINT `run_runner_workspace_id_id_pk` PRIMARY KEY(`workspace_id`,`id`),
	CONSTRAINT `name` UNIQUE(`workspace_id`,`aws_account_id`,`region`,`name`)
);
--> statement-breakpoint
ALTER TABLE `app_repo` ADD `type` enum('github');--> statement-breakpoint
ALTER TABLE `app_repo` ADD `repo_id` bigint NOT NULL;--> statement-breakpoint
ALTER TABLE `run` ADD CONSTRAINT `run_workspace_id_workspace_id_fk` FOREIGN KEY (`workspace_id`) REFERENCES `workspace`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `run` ADD CONSTRAINT `workspace_id_stage_id_fk` FOREIGN KEY (`workspace_id`,`stage_id`) REFERENCES `stage`(`workspace_id`,`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `run_runner` ADD CONSTRAINT `run_runner_workspace_id_workspace_id_fk` FOREIGN KEY (`workspace_id`) REFERENCES `workspace`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `run_runner` ADD CONSTRAINT `workspace_id_aws_account_id_fk` FOREIGN KEY (`workspace_id`,`aws_account_id`) REFERENCES `aws_account`(`workspace_id`,`account_id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `app_repo` DROP COLUMN `source`;