import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema';
import { configDotenv } from 'dotenv';
import { join } from 'path';

configDotenv({ path: join(process.cwd(), ".env"), quiet: true })


if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set');

const client = new Database(process.env.DATABASE_URL);

export const db = drizzle(client, { schema });
