/**
 * Patterns API
 * GET /api/patterns - List patterns
 * POST /api/patterns - Save a pattern
 */

import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { patterns, users } from '@/lib/db/schema';
import { eq, desc, and, or } from 'drizzle-orm';

// GET: List patterns
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const filter = searchParams.get('filter') || 'public'; // 'public', 'mine', 'all'
        const shape = searchParams.get('shape');
        const limit = parseInt(searchParams.get('limit') || '20');
        const offset = parseInt(searchParams.get('offset') || '0');

        const user = await currentUser();

        let conditions = [];

        // Filter by visibility
        if (filter === 'public') {
            conditions.push(eq(patterns.status, 'published'));
        } else if (filter === 'mine' && user) {
            conditions.push(eq(patterns.userId, user.id));
        } else if (filter === 'all' && user) {
            // User can see their own + published
            conditions.push(
                or(
                    eq(patterns.userId, user.id),
                    eq(patterns.status, 'published')
                )
            );
        } else {
            // Default to public only
            conditions.push(eq(patterns.status, 'published'));
        }

        // Filter by shape if specified
        if (shape && ['rectangle', 'circle', 'triangle', 'hexagon', 'oval'].includes(shape)) {
            conditions.push(eq(patterns.shapeType, shape as any));
        }

        const patternList = await db.query.patterns.findMany({
            where: conditions.length > 1 ? and(...conditions) : conditions[0],
            orderBy: [desc(patterns.createdAt)],
            limit,
            offset,
            with: {
                user: {
                    columns: {
                        firstName: true,
                        lastName: true,
                        imageUrl: true,
                    },
                },
            },
        });

        // Parse JSON fields for response
        const parsed = patternList.map(p => ({
            ...p,
            dimensions: p.dimensions ? JSON.parse(p.dimensions) : null,
            colors: p.colors ? JSON.parse(p.colors) : [],
            // Don't include full instructions/meshData in list view
            instructions: undefined,
            meshData: undefined,
        }));

        return NextResponse.json({
            patterns: parsed,
            count: parsed.length,
            offset,
            limit,
        });

    } catch (error) {
        console.error('Error fetching patterns:', error);
        return NextResponse.json(
            { error: 'Failed to fetch patterns' },
            { status: 500 }
        );
    }
}

// POST: Save a new pattern
export async function POST(request: NextRequest) {
    try {
        const user = await currentUser();
        if (!user) {
            return NextResponse.json(
                { error: 'Authentication required' },
                { status: 401 }
            );
        }

        const body = await request.json();
        const {
            title,
            description,
            prompt,
            shapeType,
            status = 'draft',
            instructions,
            meshData,
            colors,
            dimensions,
        } = body;

        // Validate required fields
        if (!title || !prompt || !shapeType || !instructions) {
            return NextResponse.json(
                { error: 'Missing required fields: title, prompt, shapeType, instructions' },
                { status: 400 }
            );
        }

        // Ensure user exists in DB
        const existingUser = await db.query.users.findFirst({
            where: eq(users.id, user.id),
        });

        if (!existingUser) {
            // Create user if doesn't exist (Clerk webhook may not have fired)
            await db.insert(users).values({
                id: user.id,
                email: user.emailAddresses[0]?.emailAddress || '',
                firstName: user.firstName,
                lastName: user.lastName,
                imageUrl: user.imageUrl,
            });
        }

        // Insert pattern
        const [newPattern] = await db.insert(patterns).values({
            userId: user.id,
            title,
            description,
            prompt,
            shapeType,
            status,
            instructions: typeof instructions === 'string' ? instructions : JSON.stringify(instructions),
            meshData: typeof meshData === 'string' ? meshData : JSON.stringify(meshData),
            colors: typeof colors === 'string' ? colors : JSON.stringify(colors),
            dimensions: typeof dimensions === 'string' ? dimensions : JSON.stringify(dimensions),
        }).returning();

        return NextResponse.json({
            success: true,
            pattern: {
                ...newPattern,
                instructions: undefined, // Don't return full data
                meshData: undefined,
            },
        });

    } catch (error) {
        console.error('Error saving pattern:', error);
        return NextResponse.json(
            { error: 'Failed to save pattern' },
            { status: 500 }
        );
    }
}
