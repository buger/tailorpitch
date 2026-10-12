ALTER TABLE `pipelines` ADD `leaseToken` varchar(64);--> statement-breakpoint
ALTER TABLE `pipelines` ADD CONSTRAINT `pipelines_scheduleTaskUid_unique` UNIQUE(`scheduleTaskUid`);