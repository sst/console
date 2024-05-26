ALTER TABLE `state_event` MODIFY COLUMN `urn` varchar(512) NOT NULL;--> statement-breakpoint
ALTER TABLE `state_event` MODIFY COLUMN `parent` varchar(512);--> statement-breakpoint
ALTER TABLE `state_resource` MODIFY COLUMN `urn` varchar(512) NOT NULL;--> statement-breakpoint
ALTER TABLE `state_resource` MODIFY COLUMN `parent` varchar(512);
