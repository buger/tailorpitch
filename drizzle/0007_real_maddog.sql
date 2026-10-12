CREATE TABLE `operationProgress` (
	`id` varchar(36) NOT NULL,
	`companyId` int NOT NULL,
	`userId` int NOT NULL,
	`kind` enum('company_analysis','lead_analysis','page_generation','outreach_generation') NOT NULL,
	`status` enum('running','succeeded','failed') NOT NULL DEFAULT 'running',
	`stage` int NOT NULL DEFAULT 0,
	`detail` varchar(700) NOT NULL DEFAULT 'Starting the request…',
	`startedAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`completedAt` timestamp,
	CONSTRAINT `operationProgress_id` PRIMARY KEY(`id`)
);
