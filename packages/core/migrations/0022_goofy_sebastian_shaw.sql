ALTER TABLE `run` ADD `state_update_id` char(24) NOT NULL;--> statement-breakpoint
ALTER TABLE `run` ADD `config` json NOT NULL;