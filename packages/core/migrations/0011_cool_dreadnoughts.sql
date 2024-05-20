CREATE TABLE `run_env` (
	`id` char(24) NOT NULL,
	`workspace_id` char(24) NOT NULL,
	`time_created` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`time_updated` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	`time_deleted` timestamp,
	`app_id` char(24) NOT NULL,
	`stage_name` varchar(255) NOT NULL,
	`key` varchar(255) NOT NULL,
	`value` text NOT NULL,
	CONSTRAINT `run_env_workspace_id_id_pk` PRIMARY KEY(`workspace_id`,`id`),
	CONSTRAINT `key` UNIQUE(`workspace_id`,`app_id`,`stage_name`,`key`)
);
--> statement-breakpoint
DROP TABLE `env`;--> statement-breakpoint
ALTER TABLE `run_env` ADD CONSTRAINT `run_env_workspace_id_app_id_app_workspace_id_id_fk` FOREIGN KEY (`workspace_id`,`app_id`) REFERENCES `app`(`workspace_id`,`id`) ON DELETE cascade ON UPDATE no action;