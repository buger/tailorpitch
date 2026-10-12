CREATE TABLE `pageVisits` (
	`id` int AUTO_INCREMENT NOT NULL,
	`companyId` int NOT NULL,
	`pageId` int NOT NULL,
	`visitKey` varchar(36) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `pageVisits_id` PRIMARY KEY(`id`),
	CONSTRAINT `page_tab_visit_unique` UNIQUE(`pageId`,`visitKey`)
);
