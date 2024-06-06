CREATE TABLE `runner_usage` (
	`id` char(24) NOT NULL,
	`workspace_id` char(24) NOT NULL,
	`time_created` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`time_updated` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	`time_deleted` timestamp,
	`runner_id` char(24) NOT NULL,
	`stage_id` char(24) NOT NULL,
	`time_run` timestamp,
	CONSTRAINT `runner_usage_workspace_id_id_pk` PRIMARY KEY(`workspace_id`,`id`),
	CONSTRAINT `runner_id_stage_id_unique` UNIQUE(`workspace_id`,`runner_id`,`stage_id`)
);
--> statement-breakpoint
ALTER TABLE `runner` ADD `app_repo_id` char(24) NOT NULL;--> statement-breakpoint
ALTER TABLE `runner_usage` ADD CONSTRAINT `runner_usage_workspace_id_workspace_id_fk` FOREIGN KEY (`workspace_id`) REFERENCES `workspace`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `runner_usage` ADD CONSTRAINT `runner_id_fk` FOREIGN KEY (`workspace_id`,`runner_id`) REFERENCES `runner`(`workspace_id`,`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `runner_usage` ADD CONSTRAINT `stage_id_fk` FOREIGN KEY (`workspace_id`,`stage_id`) REFERENCES `stage`(`workspace_id`,`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `runner` ADD CONSTRAINT `repo_id_fk` FOREIGN KEY (`workspace_id`,`app_repo_id`) REFERENCES `app_repo`(`workspace_id`,`id`) ON DELETE cascade ON UPDATE no action;