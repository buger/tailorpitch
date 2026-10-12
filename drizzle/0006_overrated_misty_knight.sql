CREATE TABLE `analysisDrafts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`companyId` int NOT NULL,
	`kind` enum('company','lead') NOT NULL,
	`url` varchar(2000) NOT NULL,
	`result` json NOT NULL,
	`evidence` json NOT NULL,
	`baseSignature` varchar(64) NOT NULL,
	`appliedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `analysisDrafts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `intakeControls` (
	`companyId` int NOT NULL,
	`sourcingPaused` int NOT NULL DEFAULT 0,
	`syncPaused` int NOT NULL DEFAULT 0,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `intakeControls_companyId` PRIMARY KEY(`companyId`)
);
--> statement-breakpoint
ALTER TABLE `companies` ADD `onboardingCompletedAt` timestamp;