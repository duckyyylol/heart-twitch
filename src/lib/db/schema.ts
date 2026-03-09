
import { integer, sqliteTable, text, } from 'drizzle-orm/sqlite-core';
import { DBPointRewardTriggers } from '../types';

export const sessions = sqliteTable("sessions", {
	id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()).notNull(),
	accessToken: text('accessToken').notNull(),
	refreshToken: text('refreshToken').notNull(),
	expiresIn: integer("expiresIn").default(0).notNull(),
	obtainmentTimestamp: integer("obtainmentTimestamp").$defaultFn(() => Date.now()).notNull(),
	userId: text("userId").notNull()
})

export const channels = sqliteTable("channels", {
	broadcasterId: text("broadcasterId").primaryKey().notNull(),
	broadcasterName: text("broadcasterName").notNull(),
	beerioSessionId: text("beerioSessionId").default(null),
	useRequestCommand: integer("useRequestCommand", {mode: "boolean"}).notNull().default(true)
})

export const rewards = sqliteTable("rewards", {
	rewardId: text("rewardId").primaryKey().notNull(),
	channelId: text("channelId").notNull(),
	cost: integer("cost").notNull(),
	trigger: integer("trigger").notNull().default(DBPointRewardTriggers.SONG_REQUEST)
})
