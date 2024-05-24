ALTER TABLE `state_resource` DROP INDEX `urn`;--> statement-breakpoint
ALTER TABLE `state_resource` ADD CONSTRAINT `urn` UNIQUE(`workspace_id`,`stage_id`,`urn`);