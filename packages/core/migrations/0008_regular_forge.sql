CREATE TABLE `state_update` (
	`id` char(24) NOT NULL,
	`workspace_id` char(24) NOT NULL,
	`stage_id` char(24) NOT NULL,
	`command` enum('deploy','refresh','remove','edit') NOT NULL,
	`source` json NOT NULL,
	`time_created` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`time_updated` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	`time_deleted` timestamp,
	`time_started` timestamp,
	`time_completed` timestamp,
	`resource_deleted` int,
	`resource_created` int,
	`resource_updated` int,
	`resource_same` int,
	`errors` int,
	CONSTRAINT `state_update_workspace_id_id_pk` PRIMARY KEY(`workspace_id`,`id`)
);
--> statement-breakpoint
ALTER TABLE `state_resource` DROP FOREIGN KEY `state_resource_workspace_id_stage_id_stage_workspace_id_id_fk`;
--> statement-breakpoint
ALTER TABLE `github_org` ADD `login` varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE `state_resource` ADD `action` enum('created','updated','deleted') NOT NULL;--> statement-breakpoint
ALTER TABLE `state_update` ADD CONSTRAINT `state_update_workspace_id_workspace_id_fk` FOREIGN KEY (`workspace_id`) REFERENCES `workspace`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `state_update` ADD CONSTRAINT `state_update_workspace_id_stage_id_stage_workspace_id_id_fk` FOREIGN KEY (`workspace_id`,`stage_id`) REFERENCES `stage`(`workspace_id`,`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `state_resource` ADD CONSTRAINT `state_resource_workspace_id_stage_id_stage_workspace_id_id_fk` FOREIGN KEY (`workspace_id`,`stage_id`) REFERENCES `stage`(`workspace_id`,`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `github_org` DROP COLUMN `type`;--> statement-breakpoint
ALTER TABLE `github_org` DROP COLUMN `slug`;
