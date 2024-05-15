CREATE TABLE `github_org` (
	`id` char(24) NOT NULL,
	`workspace_id` char(24) NOT NULL,
	`time_created` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`time_updated` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	`time_deleted` timestamp,
	`org_id` int NOT NULL,
	`org_slug` varchar(255) NOT NULL,
	`installation_id` int NOT NULL,
	CONSTRAINT `github_org_workspace_id_id_pk` PRIMARY KEY(`workspace_id`,`id`),
	CONSTRAINT `org` UNIQUE(`workspace_id`,`org_id`)
);
