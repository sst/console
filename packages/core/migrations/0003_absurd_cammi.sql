ALTER TABLE `state_update` DROP FOREIGN KEY `state_update_workspace_id_stage_id_stage_workspace_id_id_fk`;
--> statement-breakpoint
ALTER TABLE `state_update` ADD `index` bigint;--> statement-breakpoint
ALTER TABLE `state_update` ADD CONSTRAINT `state_update_stage_id` FOREIGN KEY (`workspace_id`,`stage_id`) REFERENCES `stage`(`workspace_id`,`id`) ON DELETE cascade ON UPDATE no action;