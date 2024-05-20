CREATE TABLE `app_repo` (
	`id` char(24) NOT NULL,
	`workspace_id` char(24) NOT NULL,
	`time_created` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`time_updated` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	`time_deleted` timestamp,
	`app_id` char(24) NOT NULL,
	`source` json NOT NULL,
	CONSTRAINT `app_repo_workspace_id_id_pk` PRIMARY KEY(`workspace_id`,`id`)
);
--> statement-breakpoint
ALTER TABLE `app_repo` ADD CONSTRAINT `app_repo_workspace_id_app_id_app_workspace_id_id_fk` FOREIGN KEY (`workspace_id`,`app_id`) REFERENCES `app`(`workspace_id`,`id`) ON DELETE cascade ON UPDATE no action;