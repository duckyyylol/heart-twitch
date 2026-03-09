import { eq } from "drizzle-orm";
import { db } from ".";
import { Channel, DBPointRewardTriggers, SessionData } from "../types";
import { channels, rewards, sessions } from "./schema";
import { RunResult } from "better-sqlite3";

export function addReward(data: typeof rewards.$inferInsert) {
    return db.insert(rewards).values(data).returning().get();
}

export function rewardIsSongRequest(rewardId: string): boolean {
    return db.select().from(rewards).where(eq(rewards.rewardId, rewardId)).get()?.trigger === DBPointRewardTriggers.SONG_REQUEST || false;
}

export async function deleteReward(rewardId: string): Promise<RunResult> {
    return await db.delete(rewards).where(eq(rewards.rewardId, rewardId)).execute();
}