import { neon, NeonQueryFunction } from '@neondatabase/serverless';
import { drizzle, NeonHttpDatabase } from 'drizzle-orm/neon-http';
import * as schema from './schema';

// Lazy-loaded database instance
let _db: NeonHttpDatabase<typeof schema> | null = null;

/**
 * Get the database instance.
 * This function lazily initializes the database connection on first call.
 * This pattern avoids issues during build time when DATABASE_URL may not be set.
 */
export function getDb(): NeonHttpDatabase<typeof schema> {
    if (_db) return _db;

    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
        throw new Error(
            'DATABASE_URL environment variable is required. ' +
            'Please set it in your .env.local file or Vercel environment variables.'
        );
    }

    // Create Neon SQL client
    const sql: NeonQueryFunction<boolean, boolean> = neon(databaseUrl);

    // Create Drizzle ORM instance with schema
    _db = drizzle(sql, { schema });

    return _db;
}

/**
 * Database instance - use this for queries.
 * Note: This getter will throw if DATABASE_URL is not set.
 * For build-time safety, use getDb() function inside your API handlers.
 */
export const db = {
    get query() {
        return getDb().query;
    },
    insert: (...args: Parameters<NeonHttpDatabase<typeof schema>['insert']>) =>
        getDb().insert(...args),
    update: (...args: Parameters<NeonHttpDatabase<typeof schema>['update']>) =>
        getDb().update(...args),
    delete: (...args: Parameters<NeonHttpDatabase<typeof schema>['delete']>) =>
        getDb().delete(...args),
    select: (...args: Parameters<NeonHttpDatabase<typeof schema>['select']>) =>
        getDb().select(...args),
};

// Export types for use in application
export type Database = NeonHttpDatabase<typeof schema>;
