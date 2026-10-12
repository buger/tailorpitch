CREATE TABLE `sourcePlans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`companyId` int NOT NULL,
	`icpId` int NOT NULL,
	`answers` json NOT NULL,
	`recommendation` json NOT NULL,
	`catalog` json NOT NULL,
	`contextHash` varchar(64) NOT NULL,
	`selection` json,
	`approvedAt` timestamp,
	`approvedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sourcePlans_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `sourcingRuns` ADD `actorId` varchar(200);--> statement-breakpoint
ALTER TABLE `sourcingRuns` ADD `sourcePlanId` int;