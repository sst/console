CREATE TABLE `run_config` (
	`id` char(24) NOT NULL,
	`workspace_id` char(24) NOT NULL,
	`time_created` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`time_updated` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	`time_deleted` timestamp,
	`app_id` char(24) NOT NULL,
	`stage_pattern` varchar(255) NOT NULL,
	`aws_account_id` char(24) NOT NULL,
	`env` json,
	CONSTRAINT `run_config_workspace_id_id_pk` PRIMARY KEY(`workspace_id`,`id`),
	CONSTRAINT `unique_stage_pattern` UNIQUE(`workspace_id`,`app_id`,`stage_pattern`)
);
--> statement-breakpoint
ALTER TABLE `run_config` ADD CONSTRAINT `run_config_workspace_id_workspace_id_fk` FOREIGN KEY (`workspace_id`) REFERENCES `workspace`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `run_config` ADD CONSTRAINT `run_config_workspace_id_app_id_app_workspace_id_id_fk` FOREIGN KEY (`workspace_id`,`app_id`) REFERENCES `app`(`workspace_id`,`id`) ON DELETE cascade ON UPDATE no action;