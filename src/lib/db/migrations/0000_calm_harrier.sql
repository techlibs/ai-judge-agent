CREATE TABLE `aggregate_scores` (
	`id` text PRIMARY KEY NOT NULL,
	`proposal_id` text NOT NULL,
	`score_bps` integer NOT NULL,
	`ipfs_cid` text,
	`chain_tx_hash` text,
	`computed_at` integer NOT NULL,
	FOREIGN KEY (`proposal_id`) REFERENCES `proposals`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `evaluations` (
	`id` text PRIMARY KEY NOT NULL,
	`proposal_id` text NOT NULL,
	`dimension` text NOT NULL,
	`score` integer,
	`score_decimals` integer DEFAULT 2,
	`confidence` text,
	`recommendation` text,
	`justification` text,
	`key_findings` text,
	`risks` text,
	`ipe_alignment_tech` integer,
	`ipe_alignment_freedom` integer,
	`ipe_alignment_progress` integer,
	`status` text DEFAULT 'pending' NOT NULL,
	`ipfs_cid` text,
	`feedback_tx_hash` text,
	`model` text,
	`prompt_version` text,
	`started_at` integer,
	`completed_at` integer,
	FOREIGN KEY (`proposal_id`) REFERENCES `proposals`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `proposals` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`problem_statement` text NOT NULL,
	`proposed_solution` text NOT NULL,
	`team_members` text NOT NULL,
	`budget_amount` integer NOT NULL,
	`budget_breakdown` text NOT NULL,
	`timeline` text NOT NULL,
	`category` text NOT NULL,
	`residency_duration` text NOT NULL,
	`demo_day_deliverable` text NOT NULL,
	`community_contribution` text NOT NULL,
	`prior_ipe_participation` integer NOT NULL,
	`links` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`ipfs_cid` text,
	`chain_token_id` integer,
	`chain_tx_hash` text,
	`created_at` integer NOT NULL
);
