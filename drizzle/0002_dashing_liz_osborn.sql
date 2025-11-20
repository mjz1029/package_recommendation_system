CREATE TABLE `user_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`session_id` varchar(64) NOT NULL,
	`phone` varchar(20) NOT NULL,
	`location` varchar(100),
	`current_plan` varchar(255),
	`current_price` int,
	`arpu` int,
	`user_data_gb` int,
	`user_voice_min` int,
	`has_broadband` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `user_sessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_sessions_session_id_unique` UNIQUE(`session_id`)
);
--> statement-breakpoint
ALTER TABLE `recommendations` MODIFY COLUMN `phone` varchar(20) NOT NULL;--> statement-breakpoint
ALTER TABLE `plans` ADD `plan_type` enum('personal','family','fttr') DEFAULT 'personal' NOT NULL;--> statement-breakpoint
ALTER TABLE `plans` ADD `has_broadband` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `recommendations` ADD `session_id` varchar(64) NOT NULL;--> statement-breakpoint
ALTER TABLE `recommendations` ADD `user_has_broadband` int;--> statement-breakpoint
ALTER TABLE `recommendations` ADD `recommended_plan_name` varchar(255);--> statement-breakpoint
ALTER TABLE `recommendations` ADD `recommended_data_gb` int;--> statement-breakpoint
ALTER TABLE `recommendations` ADD `recommended_voice_min` int;--> statement-breakpoint
ALTER TABLE `recommendations` ADD `recommended_broadband` varchar(100);--> statement-breakpoint
ALTER TABLE `recommendations` ADD `match_score` int;