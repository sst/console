ALTER TABLE `run_config` ADD `aws_account_external_id` varchar(12) NOT NULL;--> statement-breakpoint
ALTER TABLE `run_config` DROP COLUMN `aws_account_id`;