ALTER TABLE `run` ADD `app_id` char(24);--> statement-breakpoint
ALTER TABLE `run` ADD CONSTRAINT `workspace_id_app_id_fk` FOREIGN KEY (`workspace_id`,`app_id`) REFERENCES `app`(`workspace_id`,`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `run` MODIFY COLUMN `stage_id` char(24) NULL;--> statement-breakpoint
ALTER TABLE `run` MODIFY COLUMN `config` json NULL;--> statement-breakpoint
ALTER TABLE `run` DROP COLUMN `state_update_id`;