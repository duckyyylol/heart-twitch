import { eq } from "drizzle-orm";
import { db } from ".";
import { SessionData } from "../types";
import { sessions } from "./schema";
import { RunResult } from "better-sqlite3";

export function createSession(data: typeof sessions.$inferInsert): SessionData {
    return db.insert(sessions).values(data).returning().get();
}

export function getSessionByToken(token: string | null): SessionData | null {
    return db.select().from(sessions).where(eq(sessions.accessToken, token)).get();
}

export function getSessionByUserId(userId: string): SessionData | null {
    return db.select().from(sessions).where(eq(sessions.userId, userId)).get();
}

export async function updateSession(userId: string, data: typeof sessions.$inferInsert): Promise<RunResult> {
    return await db.update(sessions).set(data).where(eq(sessions.userId, userId)).execute()
}