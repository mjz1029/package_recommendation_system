CREATE TABLE `plans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`price` int NOT NULL,
	`data_gb` int NOT NULL,
	`voice_min` int NOT NULL,
	`broadband` varchar(100),
	`benefits` text,
	`on_shelf` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `plans_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `recommendations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`phone` varchar(20),
	`location` varchar(100),
	`current_plan` varchar(255),
	`current_price` int,
	`arpu` int,
	`user_data_gb` int,
	`user_voice_min` int,
	`recommended_plan_id` int,
	`recommended_price` int,
	`target_price` int,
	`reason` text,
	`resource_risk` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `recommendations_id` PRIMARY KEY(`id`)
);
