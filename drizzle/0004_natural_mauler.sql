CREATE TABLE `mcpOAuthSessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`companyId` int NOT NULL,
	`userId` int NOT NULL,
	`stateHash` varchar(64) NOT NULL,
	`encryptedPayload` text NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`consumedAt` timestamp,
	CONSTRAINT `mcpOAuthSessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `mcpOAuthSessions_stateHash_unique` UNIQUE(`stateHash`)
);
--> statement-breakpoint
CREATE TABLE `pipelineJobs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`companyId` int NOT NULL,
	`pipelineId` int NOT NULL,
	`leadId` int,
	`stage` enum('discover','qualify','page','outreach') NOT NULL,
	`provider` varchar(50) NOT NULL,
	`status` varchar(50) NOT NULL DEFAULT 'queued',
	`sourceRunId` int,
	`manusTaskId` varchar(100),
	`taskUrl` varchar(2000),
	`eventCursor` varchar(500),
	`result` json,
	`error` text,
	`configSnapshot` json NOT NULL,
	`startedAt` timestamp,
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `pipelineJobs_id` PRIMARY KEY(`id`),
	CONSTRAINT `pipeline_lead_stage` UNIQUE(`pipelineId`,`leadId`,`stage`)
);
--> statement-breakpoint
CREATE TABLE `pipelines` (
	`id` int AUTO_INCREMENT NOT NULL,
	`companyId` int NOT NULL,
	`name` varchar(200) NOT NULL DEFAULT 'Your prospecting agent',
	`config` json NOT NULL,
	`enabled` int NOT NULL DEFAULT 0,
	`scheduleTaskUid` varchar(100),
	`scheduleId` varchar(100),
	`scheduleStatus` varchar(50) NOT NULL DEFAULT 'not_registered',
	`dayKey` varchar(10),
	`discoveriesToday` int NOT NULL DEFAULT 0,
	`nextDiscoveryAt` timestamp,
	`leaseUntil` timestamp,
	`lastTickAt` timestamp,
	`lastError` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `pipelines_id` PRIMARY KEY(`id`),
	CONSTRAINT `pipelines_companyId_unique` UNIQUE(`companyId`)
);
--> statement-breakpoint
ALTER TABLE `leads` ADD `pipelineId` int;--> statement-breakpoint
ALTER TABLE `leads` ADD `pipelineSelectedAt` timestamp;