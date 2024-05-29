ALTER TABLE `run_runner` DROP FOREIGN KEY `workspace_id_aws_account_id_fk`;
--> statement-breakpoint
ALTER TABLE `run_runner` MODIFY COLUMN `aws_account_id` char(24) NOT NULL;--> statement-breakpoint
ALTER TABLE `run_runner` ADD CONSTRAINT `workspace_id_aws_account_id_fk` FOREIGN KEY (`workspace_id`,`aws_account_id`) REFERENCES `aws_account`(`workspace_id`,`id`) ON DELETE cascade ON UPDATE no action;