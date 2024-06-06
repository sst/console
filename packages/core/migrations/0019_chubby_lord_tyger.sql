CREATE TABLE `runner` (
	`id` char(24) NOT NULL,
	`workspace_id` char(24) NOT NULL,
	`time_created` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`time_updated` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	`time_deleted` timestamp,
	`time_run` timestamp,
	`aws_account_id` char(24) NOT NULL,
	`region` varchar(255) NOT NULL,
	`architecture` enum('x86_64','arm64') NOT NULL,
	`image` varchar(255) NOT NULL,
	`resource` json,
	CONSTRAINT `runner_workspace_id_id_pk` PRIMARY KEY(`workspace_id`,`id`)
);
--> statement-breakpoint
DROP TABLE `run_runner`;--> statement-breakpoint
ALTER TABLE `runner` ADD CONSTRAINT `runner_workspace_id_workspace_id_fk` FOREIGN KEY (`workspace_id`) REFERENCES `workspace`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `runner` ADD CONSTRAINT `workspace_id_aws_account_id_fk` FOREIGN KEY (`workspace_id`,`aws_account_id`) REFERENCES `aws_account`(`workspace_id`,`id`) ON DELETE cascade ON UPDATE no action;