ALTER TABLE `run` ADD `active` boolean;--> statement-breakpoint
ALTER TABLE `run` ADD CONSTRAINT `unique_active` UNIQUE(`workspace_id`,`stage_id`,`active`);