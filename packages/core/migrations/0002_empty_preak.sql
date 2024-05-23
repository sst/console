CREATE TABLE `state_event` (
	`id` char(24) NOT NULL,
	`workspace_id` char(24) NOT NULL,
	`stage_id` char(24) NOT NULL,
	`update_id` char(24) NOT NULL,
	`type` varchar(255) NOT NULL,
	`urn` varchar(255) NOT NULL,
	`outputs` json NOT NULL,
	`action` enum('created','updated','deleted') NOT NULL,
	`inputs` json NOT NULL,
	`parent` varchar(255),
	`custom` boolean NOT NULL,
	`time_created` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`time_updated` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	`time_deleted` timestamp,
	`time_state_created` timestamp,
	`time_state_modified` timestamp,
	CONSTRAINT `state_event_workspace_id_id_pk` PRIMARY KEY(`workspace_id`,`id`),
	CONSTRAINT `urn` UNIQUE(`workspace_id`,`stage_id`,`update_id`,`urn`)
);
--> statement-breakpoint
ALTER TABLE `state_event` ADD CONSTRAINT `state_event_workspace_id_workspace_id_fk` FOREIGN KEY (`workspace_id`) REFERENCES `workspace`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `state_event` ADD CONSTRAINT `state_event_stage_id` FOREIGN KEY (`workspace_id`,`stage_id`) REFERENCES `stage`(`workspace_id`,`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `state_event` ADD CONSTRAINT `state_event_update_id` FOREIGN KEY (`workspace_id`,`update_id`) REFERENCES `state_update`(`workspace_id`,`id`) ON DELETE cascade ON UPDATE no action;