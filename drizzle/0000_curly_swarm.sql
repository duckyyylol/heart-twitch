CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`accessToken` text NOT NULL,
	`refreshToken` text NOT NULL,
	`expiresIn` integer DEFAULT 0 NOT NULL,
	`obtainmentTimestamp` integer NOT NULL
);
