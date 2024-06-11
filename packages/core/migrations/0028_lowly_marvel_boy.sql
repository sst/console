ALTER TABLE `app_repo` ADD `last_event_id` char(24);--> statement-breakpoint
ALTER TABLE `app_repo` ADD `last_event_status` text;--> statement-breakpoint
ALTER TABLE `app_repo` ADD `last_event_state_update_id` char(24);--> statement-breakpoint
ALTER TABLE `app_repo` DROP COLUMN `last_event_error`;