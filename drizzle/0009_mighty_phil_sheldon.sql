CREATE TABLE `icpAgentCycles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`companyId` int NOT NULL,
	`agentId` int NOT NULL,
	`dayKey` varchar(10) NOT NULL,
	`status` varchar(40) NOT NULL DEFAULT 'planning',
	`actorId` varchar(200),
	`externalId` varchar(100),
	`datasetId` varchar(100),
	`decision` json,
	`input` json,
	`contextHash` varchar(64) NOT NULL,
	`sourcePlanId` int NOT NULL,
	`candidatesExamined` int NOT NULL DEFAULT 0,
	`result` json,
	`error` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `icpAgentCycles_id` PRIMARY KEY(`id`),
	CONSTRAINT `icpAgentCycles_externalId_unique` UNIQUE(`externalId`)
);
--> statement-breakpoint
CREATE TABLE `icpAgentDeliveries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`companyId` int NOT NULL,
	`agentId` int NOT NULL,
	`icpId` int NOT NULL,
	`leadId` int NOT NULL,
	`cycleId` int NOT NULL,
	`dayKey` varchar(10) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `icpAgentDeliveries_id` PRIMARY KEY(`id`),
	CONSTRAINT `icpAgentDeliveries_cycleId_unique` UNIQUE(`cycleId`),
	CONSTRAINT `icp_agent_unique_delivery` UNIQUE(`companyId`,`leadId`)
);
--> statement-breakpoint
CREATE TABLE `icpAgents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`companyId` int NOT NULL,
	`icpId` int NOT NULL,
	`name` varchar(200) NOT NULL,
	`sourcePlanId` int NOT NULL,
	`config` json NOT NULL,
	`enabled` int NOT NULL DEFAULT 0,
	`scheduleTaskUid` varchar(100),
	`nextRunAt` timestamp,
	`leaseUntil` timestamp,
	`leaseToken` varchar(64),
	`lastTickAt` timestamp,
	`lastError` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `icpAgents_id` PRIMARY KEY(`id`),
	CONSTRAINT `icpAgents_scheduleTaskUid_unique` UNIQUE(`scheduleTaskUid`),
	CONSTRAINT `icp_agent_company_icp` UNIQUE(`companyId`,`icpId`)
);
