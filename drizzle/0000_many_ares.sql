CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`video_file_name` text NOT NULL,
	`video_url` text NOT NULL,
	`video_file_size` integer,
	`video_file_last_modified` integer,
	`video_file_type` text,
	`created_at` integer,
	`updated_at` integer
);
--> statement-breakpoint
CREATE TABLE `subtitles` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`start_time` real NOT NULL,
	`end_time` real NOT NULL,
	`text` text NOT NULL,
	`order` integer NOT NULL,
	`created_at` integer,
	FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON UPDATE no action ON DELETE cascade
);
