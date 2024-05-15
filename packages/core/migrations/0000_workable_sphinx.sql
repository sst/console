CREATE TABLE `account` (
	`id` char(24) NOT NULL,
	`time_created` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`time_updated` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	`time_deleted` timestamp,
	`email` varchar(255) NOT NULL,
	CONSTRAINT `account_id` PRIMARY KEY(`id`),
	CONSTRAINT `email` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `app` (
	`id` char(24) NOT NULL,
	`workspace_id` char(24) NOT NULL,
	`time_created` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`time_updated` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	`time_deleted` timestamp,
	`name` varchar(255) NOT NULL,
	CONSTRAINT `app_workspace_id_id_pk` PRIMARY KEY(`workspace_id`,`id`),
	CONSTRAINT `name` UNIQUE(`workspace_id`,`name`)
);
--> statement-breakpoint
CREATE TABLE `resource` (
	`id` char(24) NOT NULL,
	`workspace_id` char(24) NOT NULL,
	`time_created` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`time_updated` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	`time_deleted` timestamp,
	`type` varchar(255) NOT NULL,
	`stack_id` varchar(255) NOT NULL,
	`cfn_id` varchar(255) NOT NULL,
	`construct_id` varchar(255),
	`stage_id` char(24) NOT NULL,
	`addr` varchar(255) NOT NULL,
	`metadata` json NOT NULL,
	`enrichment` json NOT NULL,
	CONSTRAINT `resource_workspace_id_id_pk` PRIMARY KEY(`workspace_id`,`id`),
	CONSTRAINT `addr` UNIQUE(`workspace_id`,`stage_id`,`addr`)
);
--> statement-breakpoint
CREATE TABLE `stage` (
	`id` char(24) NOT NULL,
	`workspace_id` char(24) NOT NULL,
	`time_created` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`time_updated` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	`time_deleted` timestamp,
	`app_id` char(24) NOT NULL,
	`aws_account_id` char(24) NOT NULL,
	`region` varchar(255) NOT NULL,
	`name` varchar(255) NOT NULL,
	`unsupported` boolean,
	CONSTRAINT `stage_workspace_id_id_pk` PRIMARY KEY(`workspace_id`,`id`),
	CONSTRAINT `name` UNIQUE(`app_id`,`aws_account_id`,`region`,`name`)
);
--> statement-breakpoint
CREATE TABLE `aws_account` (
	`id` char(24) NOT NULL,
	`workspace_id` char(24) NOT NULL,
	`time_created` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`time_updated` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	`time_deleted` timestamp,
	`account_id` varchar(12) NOT NULL,
	`time_failed` timestamp,
	`time_discovered` timestamp,
	CONSTRAINT `aws_account_workspace_id_id_pk` PRIMARY KEY(`workspace_id`,`id`),
	CONSTRAINT `account_id` UNIQUE(`workspace_id`,`account_id`)
);
--> statement-breakpoint
CREATE TABLE `stripe` (
	`id` char(24) NOT NULL,
	`workspace_id` char(24) NOT NULL,
	`time_created` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`time_updated` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	`time_deleted` timestamp,
	`customer_id` varchar(255),
	`subscription_id` varchar(255),
	`subscription_item_id` varchar(255),
	`standing` enum('good','overdue'),
	`time_trial_ended` timestamp,
	CONSTRAINT `stripe_workspace_id_id_pk` PRIMARY KEY(`workspace_id`,`id`),
	CONSTRAINT `workspaceID` UNIQUE(`workspace_id`)
);
--> statement-breakpoint
CREATE TABLE `usage` (
	`workspace_id` char(24) NOT NULL,
	`time_created` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`time_updated` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	`time_deleted` timestamp,
	`id` char(24) NOT NULL,
	`stage_id` char(24) NOT NULL,
	`day` date NOT NULL,
	`invocations` bigint NOT NULL,
	CONSTRAINT `usage_workspace_id_id_pk` PRIMARY KEY(`workspace_id`,`id`),
	CONSTRAINT `stage` UNIQUE(`workspace_id`,`stage_id`,`day`)
);
--> statement-breakpoint
CREATE TABLE `issue` (
	`id` char(24) NOT NULL,
	`workspace_id` char(24) NOT NULL,
	`time_created` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`time_updated` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	`time_deleted` timestamp,
	`stage_id` char(24) NOT NULL,
	`error` text NOT NULL,
	`message` text NOT NULL,
	`error_id` varchar(255) NOT NULL,
	`group` varchar(255) NOT NULL,
	`stack` json,
	`pointer` json,
	`count` bigint,
	`time_resolved` timestamp,
	`time_seen` timestamp NOT NULL,
	`resolver` json,
	`time_ignored` timestamp,
	`ignorer` json,
	`invocation` longtext,
	CONSTRAINT `issue_workspace_id_id_pk` PRIMARY KEY(`workspace_id`,`id`),
	CONSTRAINT `group` UNIQUE(`workspace_id`,`stage_id`,`group`)
);
--> statement-breakpoint
CREATE TABLE `issue_alert` (
	`id` char(24) NOT NULL,
	`workspace_id` char(24) NOT NULL,
	`time_created` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`time_updated` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	`time_deleted` timestamp,
	`source` json NOT NULL,
	`destination` json NOT NULL,
	CONSTRAINT `issue_alert_workspace_id_id_pk` PRIMARY KEY(`workspace_id`,`id`)
);
--> statement-breakpoint
CREATE TABLE `issue_alert_limit` (
	`id` char(24) NOT NULL,
	`workspace_id` char(24) NOT NULL,
	`time_created` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`time_updated` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	`time_deleted` timestamp,
	CONSTRAINT `issue_alert_limit_workspace_id_id_pk` PRIMARY KEY(`workspace_id`,`id`)
);
--> statement-breakpoint
CREATE TABLE `issue_count` (
	`id` char(24) NOT NULL,
	`workspace_id` char(24) NOT NULL,
	`time_created` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`time_updated` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	`time_deleted` timestamp,
	`hour` timestamp NOT NULL,
	`stage_id` char(24) NOT NULL,
	`group` varchar(255) NOT NULL,
	`log_group` varchar(512),
	`count` bigint NOT NULL,
	CONSTRAINT `issue_count_workspace_id_id_pk` PRIMARY KEY(`workspace_id`,`id`),
	CONSTRAINT `unique` UNIQUE(`workspace_id`,`stage_id`,`group`,`hour`)
);
--> statement-breakpoint
CREATE TABLE `issue_subscriber` (
	`id` char(24) NOT NULL,
	`workspace_id` char(24) NOT NULL,
	`time_created` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`time_updated` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	`time_deleted` timestamp,
	`stage_id` char(24) NOT NULL,
	`function_id` char(24) NOT NULL,
	`log_group` varchar(512),
	CONSTRAINT `issue_subscriber_workspace_id_stage_id_id_pk` PRIMARY KEY(`workspace_id`,`stage_id`,`id`),
	CONSTRAINT `unique` UNIQUE(`workspace_id`,`stage_id`,`function_id`,`log_group`)
);
--> statement-breakpoint
CREATE TABLE `lambda_payload` (
	`id` char(24) NOT NULL,
	`workspace_id` char(24) NOT NULL,
	`time_created` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`time_updated` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	`time_deleted` timestamp,
	`key` varchar(255) NOT NULL,
	`name` varchar(255) NOT NULL,
	`payload` json NOT NULL,
	`creator` json NOT NULL,
	CONSTRAINT `lambda_payload_workspace_id_id_pk` PRIMARY KEY(`workspace_id`,`id`)
);
--> statement-breakpoint
CREATE TABLE `log_poller` (
	`id` char(24) NOT NULL,
	`workspace_id` char(24) NOT NULL,
	`time_created` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`time_updated` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	`time_deleted` timestamp,
	`stage_id` char(24) NOT NULL,
	`log_group` varchar(512) NOT NULL,
	`execution_arn` text,
	CONSTRAINT `log_poller_workspace_id_id_pk` PRIMARY KEY(`workspace_id`,`id`),
	CONSTRAINT `log_group` UNIQUE(`workspace_id`,`stage_id`,`log_group`)
);
--> statement-breakpoint
CREATE TABLE `log_search` (
	`id` char(24) NOT NULL,
	`workspace_id` char(24) NOT NULL,
	`time_created` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`time_updated` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	`time_deleted` timestamp,
	`user_id` char(24) NOT NULL,
	`profile_id` varchar(33),
	`stage_id` char(24) NOT NULL,
	`log_group` varchar(512) NOT NULL,
	`time_start` timestamp,
	`time_end` timestamp,
	`outcome` enum('completed','partial'),
	CONSTRAINT `log_search_workspace_id_id_pk` PRIMARY KEY(`workspace_id`,`id`)
);
--> statement-breakpoint
CREATE TABLE `replicache_client` (
	`id` char(36) NOT NULL,
	`mutation_id` bigint NOT NULL DEFAULT 0,
	`time_created` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`time_updated` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	`time_deleted` timestamp,
	`client_group_id` char(36) NOT NULL,
	`client_version` int NOT NULL,
	CONSTRAINT `replicache_client_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `replicache_client_group` (
	`time_created` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`time_updated` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	`time_deleted` timestamp,
	`id` char(36) NOT NULL,
	`actor` json,
	`cvr_version` int NOT NULL,
	`client_version` int NOT NULL,
	CONSTRAINT `replicache_client_group_id_pk` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `replicache_cvr` (
	`id` int NOT NULL,
	`time_created` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`time_updated` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	`time_deleted` timestamp,
	`data` json NOT NULL,
	`client_group_id` char(36) NOT NULL,
	`client_version` int NOT NULL,
	CONSTRAINT `replicache_cvr_client_group_id_id_pk` PRIMARY KEY(`client_group_id`,`id`)
);
--> statement-breakpoint
CREATE TABLE `slack_team` (
	`id` char(24) NOT NULL,
	`workspace_id` char(24) NOT NULL,
	`time_created` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`time_updated` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	`time_deleted` timestamp,
	`team_id` varchar(255) NOT NULL,
	`team_name` varchar(255) NOT NULL,
	`access_token` text NOT NULL,
	CONSTRAINT `slack_team_workspace_id_id_pk` PRIMARY KEY(`workspace_id`,`id`),
	CONSTRAINT `team` UNIQUE(`workspace_id`,`team_id`)
);
--> statement-breakpoint
CREATE TABLE `user` (
	`id` char(24) NOT NULL,
	`workspace_id` char(24) NOT NULL,
	`time_created` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`time_updated` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	`time_deleted` timestamp,
	`email` varchar(255) NOT NULL,
	`time_seen` timestamp,
	CONSTRAINT `user_workspace_id_id_pk` PRIMARY KEY(`workspace_id`,`id`),
	CONSTRAINT `email` UNIQUE(`workspace_id`,`email`)
);
--> statement-breakpoint
CREATE TABLE `warning` (
	`id` char(24) NOT NULL,
	`workspace_id` char(24) NOT NULL,
	`time_created` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`time_updated` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	`time_deleted` timestamp,
	`stage_id` char(24),
	`type` varchar(255) NOT NULL,
	`target` varchar(255) NOT NULL,
	`data` json,
	CONSTRAINT `warning_workspace_id_id_pk` PRIMARY KEY(`workspace_id`,`id`),
	CONSTRAINT `unique` UNIQUE(`workspace_id`,`stage_id`,`type`,`target`)
);
--> statement-breakpoint
CREATE TABLE `workspace` (
	`id` char(24) NOT NULL,
	`time_created` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`time_updated` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	`time_deleted` timestamp,
	`slug` varchar(255) NOT NULL,
	`time_gated` timestamp,
	CONSTRAINT `workspace_id` PRIMARY KEY(`id`),
	CONSTRAINT `slug` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE INDEX `updated` ON `app` (`time_updated`);--> statement-breakpoint
CREATE INDEX `updated` ON `stage` (`time_updated`);--> statement-breakpoint
CREATE INDEX `updated` ON `aws_account` (`time_updated`);--> statement-breakpoint
CREATE INDEX `updated` ON `issue` (`workspace_id`,`time_updated`);--> statement-breakpoint
CREATE INDEX `client_group_id` ON `replicache_client` (`client_group_id`);--> statement-breakpoint
CREATE INDEX `email_global` ON `user` (`email`);
