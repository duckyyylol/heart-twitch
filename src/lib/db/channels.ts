import { eq } from "drizzle-orm";
import { db } from ".";
import { Channel, SessionData } from "../types";
import { channels, sessions } from "./schema";
import { RunResult } from "better-sqlite3";

export function addChannel(data: typeof channels.$inferInsert): Channel {
    return db.insert(channels).values(data).returning().get();
}

export function getAllChannels(): Channel[] {
    return db.select().from(channels).all();
}

export function isChannelAdded(broadcasterId: string): boolean {
    return db.select().from(channels).where(eq(channels.broadcasterId, broadcasterId)).get() ? true : false;
}

export async function setUseRequestCommand(broadcasterName: string, useCommand: boolean): Promise<RunResult> {
    return await db.update(channels).set({useRequestCommand: useCommand}).where(eq(channels.broadcasterName, broadcasterName)).execute()
}

export async function setChannelSessionId(broadcasterName: string, beerioSessionId: string): Promise<RunResult> {
    return await db.update(channels).set({beerioSessionId: beerioSessionId}).where(eq(channels.broadcasterName, broadcasterName)).execute()
}

export function getChannelByName(broadcasterName: string): Channel | null {
    return db.select().from(channels).where(eq(channels.broadcasterName, broadcasterName)).get();
}

export async function leaveChannel(broadcasterId: string): Promise<RunResult> {
    return await db.delete(channels).where(eq(channels.broadcasterId, broadcasterId)).execute();
}