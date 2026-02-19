CREATE TABLE IF NOT EXISTS `build_items` (
	`id` text PRIMARY KEY NOT NULL,
	`build_id` text NOT NULL,
	`component_id` text NOT NULL,
	`quantity` integer DEFAULT 1 NOT NULL,
	FOREIGN KEY (`build_id`) REFERENCES `builds`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`component_id`) REFERENCES `components`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `builds` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`total_price` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `categories` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`icon` text,
	`sort_order` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `categories_slug_unique` ON `categories` (`slug`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `compatibility_rules` (
	`id` text PRIMARY KEY NOT NULL,
	`source_category_id` text,
	`target_category_id` text NOT NULL,
	`rule_type` text NOT NULL,
	`source_spec_key` text NOT NULL,
	`target_spec_key` text NOT NULL,
	`operator` text NOT NULL,
	`description` text,
	FOREIGN KEY (`source_category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`target_category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `component_specs` (
	`id` text PRIMARY KEY NOT NULL,
	`component_id` text NOT NULL,
	`spec_key` text NOT NULL,
	`spec_value` text NOT NULL,
	FOREIGN KEY (`component_id`) REFERENCES `components`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `components` (
	`id` text PRIMARY KEY NOT NULL,
	`category_id` text NOT NULL,
	`name` text NOT NULL,
	`brand` text NOT NULL,
	`model` text NOT NULL,
	`price` integer DEFAULT 0 NOT NULL,
	`image_url` text,
	`release_date` text,
	`is_active` integer DEFAULT true NOT NULL,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `price_history` (
	`id` text PRIMARY KEY NOT NULL,
	`source_offer_id` text NOT NULL,
	`price` integer NOT NULL,
	`currency` text DEFAULT 'BRL' NOT NULL,
	`in_stock` integer DEFAULT true NOT NULL,
	`captured_at` text NOT NULL,
	FOREIGN KEY (`source_offer_id`) REFERENCES `source_offers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `source_offers` (
	`id` text PRIMARY KEY NOT NULL,
	`store` text NOT NULL,
	`external_id` text,
	`category_id` text NOT NULL,
	`component_id` text,
	`title` text NOT NULL,
	`normalized_name` text NOT NULL,
	`brand` text,
	`model` text,
	`price` integer NOT NULL,
	`currency` text DEFAULT 'BRL' NOT NULL,
	`in_stock` integer DEFAULT true NOT NULL,
	`stock_text` text,
	`url` text NOT NULL,
	`image_url` text,
	`meta_json` text,
	`last_seen_at` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`component_id`) REFERENCES `components`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `techpowerup_gpu_specs_queue` (
	`id` text PRIMARY KEY NOT NULL,
	`url` text NOT NULL,
	`external_gpu_id` text,
	`gpu_name` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`attempt_count` integer DEFAULT 0 NOT NULL,
	`last_error` text,
	`last_attempt_at` text,
	`completed_at` text,
	`payload_json` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `techpowerup_gpu_specs_queue_url_unique` ON `techpowerup_gpu_specs_queue` (`url`);