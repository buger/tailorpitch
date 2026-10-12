CREATE TABLE `activity` (
	`id` int AUTO_INCREMENT NOT NULL,
	`companyId` int NOT NULL,
	`leadId` int,
	`type` varchar(80) NOT NULL,
	`message` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `activity_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `brandAssets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`companyId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`key` varchar(1000) NOT NULL,
	`url` varchar(2000) NOT NULL,
	`mime` varchar(100) NOT NULL,
	`note` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `brandAssets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `companies` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slug` varchar(100) NOT NULL,
	`name` varchar(200) NOT NULL,
	`website` varchar(2000) NOT NULL,
	`brand` json NOT NULL,
	`seedVersion` int NOT NULL DEFAULT 0,
	`publicOrigin` varchar(2000),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `companies_id` PRIMARY KEY(`id`),
	CONSTRAINT `companies_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `icps` (
	`id` int AUTO_INCREMENT NOT NULL,
	`companyId` int NOT NULL,
	`criteria` json NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `icps_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `inboxMessages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`companyId` int NOT NULL,
	`provider` varchar(50) NOT NULL,
	`externalId` varchar(255) NOT NULL,
	`from` varchar(500) NOT NULL,
	`subject` varchar(500) NOT NULL,
	`snippet` text NOT NULL,
	`receivedAt` timestamp NOT NULL,
	CONSTRAINT `inboxMessages_id` PRIMARY KEY(`id`),
	CONSTRAINT `inbox_external` UNIQUE(`companyId`,`provider`,`externalId`)
);
--> statement-breakpoint
CREATE TABLE `integrations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`companyId` int NOT NULL,
	`provider` varchar(50) NOT NULL,
	`encryptedConfig` text NOT NULL,
	`displayName` varchar(320) NOT NULL,
	`status` varchar(40) NOT NULL DEFAULT 'connected',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `integrations_id` PRIMARY KEY(`id`),
	CONSTRAINT `integration_company_provider` UNIQUE(`companyId`,`provider`)
);
--> statement-breakpoint
CREATE TABLE `invitations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`companyId` int NOT NULL,
	`email` varchar(320) NOT NULL,
	`role` enum('admin','member') NOT NULL,
	`tokenHash` varchar(64) NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`acceptedAt` timestamp,
	CONSTRAINT `invitations_id` PRIMARY KEY(`id`),
	CONSTRAINT `invitations_tokenHash_unique` UNIQUE(`tokenHash`)
);
--> statement-breakpoint
CREATE TABLE `leads` (
	`id` int AUTO_INCREMENT NOT NULL,
	`companyId` int NOT NULL,
	`icpId` int,
	`companyName` varchar(200) NOT NULL,
	`website` varchar(2000) NOT NULL,
	`domain` varchar(255) NOT NULL,
	`contactName` varchar(200) NOT NULL DEFAULT '',
	`email` varchar(320) NOT NULL DEFAULT '',
	`title` varchar(200) NOT NULL DEFAULT '',
	`linkedinUrl` varchar(2000) NOT NULL DEFAULT '',
	`xUrl` varchar(2000) NOT NULL DEFAULT '',
	`notes` text,
	`source` varchar(80) NOT NULL DEFAULT 'manual',
	`sourceUrl` varchar(2000),
	`status` enum('new','researching','researched','qualified','page_ready','contacted','suppressed') NOT NULL DEFAULT 'new',
	`score` int,
	`research` json,
	`researchedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `leads_id` PRIMARY KEY(`id`),
	CONSTRAINT `lead_company_domain` UNIQUE(`companyId`,`domain`)
);
--> statement-breakpoint
CREATE TABLE `memberships` (
	`id` int AUTO_INCREMENT NOT NULL,
	`companyId` int NOT NULL,
	`userId` int NOT NULL,
	`role` enum('owner','admin','member') NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `memberships_id` PRIMARY KEY(`id`),
	CONSTRAINT `membership_company_user` UNIQUE(`companyId`,`userId`)
);
--> statement-breakpoint
CREATE TABLE `oauthStates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`companyId` int NOT NULL,
	`userId` int NOT NULL,
	`stateHash` varchar(64) NOT NULL,
	`redirectUri` varchar(2000) NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`consumedAt` timestamp,
	CONSTRAINT `oauthStates_id` PRIMARY KEY(`id`),
	CONSTRAINT `oauthStates_stateHash_unique` UNIQUE(`stateHash`)
);
--> statement-breakpoint
CREATE TABLE `outreach` (
	`id` int AUTO_INCREMENT NOT NULL,
	`companyId` int NOT NULL,
	`leadId` int NOT NULL,
	`pageId` int,
	`channel` enum('email','linkedin','x') NOT NULL,
	`recipient` varchar(2000) NOT NULL DEFAULT '',
	`subject` varchar(240) NOT NULL DEFAULT '',
	`body` text NOT NULL,
	`rationale` text,
	`status` enum('draft','sending','accepted','manual','failed','unknown') NOT NULL DEFAULT 'draft',
	`providerId` varchar(255),
	`error` text,
	`sentAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `outreach_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`companyId` int NOT NULL,
	`leadId` int NOT NULL,
	`shareToken` varchar(64) NOT NULL,
	`status` enum('draft','published') NOT NULL DEFAULT 'draft',
	`content` json NOT NULL,
	`brandSnapshot` json NOT NULL,
	`title` varchar(200) NOT NULL,
	`views` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `pages_id` PRIMARY KEY(`id`),
	CONSTRAINT `pages_shareToken_unique` UNIQUE(`shareToken`)
);
--> statement-breakpoint
CREATE TABLE `sourcingRuns` (
	`id` int AUTO_INCREMENT NOT NULL,
	`companyId` int NOT NULL,
	`icpId` int,
	`leadId` int,
	`type` enum('discovery','research') NOT NULL,
	`externalId` varchar(100),
	`datasetId` varchar(100),
	`status` varchar(40) NOT NULL DEFAULT 'STARTING',
	`imported` int NOT NULL DEFAULT 0,
	`requestedLimit` int NOT NULL DEFAULT 10,
	`query` text,
	`error` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	CONSTRAINT `sourcingRuns_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `submissions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`companyId` int,
	`pageId` int,
	`email` varchar(320) NOT NULL,
	`source` varchar(100) NOT NULL,
	`consent` int NOT NULL DEFAULT 1,
	`consentText` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `submissions_id` PRIMARY KEY(`id`),
	CONSTRAINT `submission_email_source` UNIQUE(`email`,`source`)
);
--> statement-breakpoint
CREATE TABLE `suppressions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`companyId` int NOT NULL,
	`email` varchar(320) NOT NULL,
	`token` varchar(64) NOT NULL,
	`active` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `suppressions_id` PRIMARY KEY(`id`),
	CONSTRAINT `suppressions_token_unique` UNIQUE(`token`),
	CONSTRAINT `suppression_company_email` UNIQUE(`companyId`,`email`)
);
