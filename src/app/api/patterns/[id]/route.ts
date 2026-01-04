/**
 * Single Pattern API
 * GET /api/patterns/[id] - Get pattern details
 * PATCH /api/patterns/[id] - Update pattern (status, etc.)
 * DELETE /api/patterns/[id] - Delete pattern
 */

import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { patterns } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

interface RouteParams {
    params: Promise<{ id: string }>;
}

// GET: Get single pattern
export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params;
        const user = await currentUser();

        const pattern = await db.query.patterns.findFirst({
            where: eq(patterns.id, id),
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

        if (!pattern) {
            return NextResponse.json(
                { error: 'Pattern not found' },
                { status: 404 }
            );
        }

        // Check visibility
        if (pattern.status !== 'published' && pattern.userId !== user?.id) {
            return NextResponse.json(
                { error: 'Pattern not found' },
                { status: 404 }
            );
        }

        // Parse JSON fields
        const parsed = {
            ...pattern,
            instructions: pattern.instructions ? JSON.parse(pattern.instructions) : null,
            meshData: pattern.meshData ? JSON.parse(pattern.meshData) : null,
            dimensions: pattern.dimensions ? JSON.parse(pattern.dimensions) : null,
            colors: pattern.colors ? JSON.parse(pattern.colors) : [],
        };

        return NextResponse.json({ pattern: parsed });

    } catch (error) {
        console.error('Error fetching pattern:', error);
        return NextResponse.json(
            { error: 'Failed to fetch pattern' },
            { status: 500 }
        );
    }
}

// PATCH: Update pattern
export async function PATCH(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params;
        const user = await currentUser();

        if (!user) {
            return NextResponse.json(
                { error: 'Authentication required' },
                { status: 401 }
            );
        }

        // Verify ownership
        const pattern = await db.query.patterns.findFirst({
            where: and(
                eq(patterns.id, id),
                eq(patterns.userId, user.id)
            ),
        });

        if (!pattern) {
            return NextResponse.json(
                { error: 'Pattern not found or not authorized' },
                { status: 404 }
            );
        }

        const body = await request.json();
        const { status, title, description } = body;

        const updates: Record<string, unknown> = {
            updatedAt: new Date(),
        };

        if (status && ['draft', 'published', 'private'].includes(status)) {
            updates.status = status;
        }
        if (title !== undefined) {
            updates.title = title;
        }
        if (description !== undefined) {
            updates.description = description;
        }

        const [updated] = await db
            .update(patterns)
            .set(updates)
            .where(eq(patterns.id, id))
            .returning();

        return NextResponse.json({
            success: true,
            pattern: {
                id: updated.id,
                title: updated.title,
                status: updated.status,
                updatedAt: updated.updatedAt,
            },
        });

    } catch (error) {
        console.error('Error updating pattern:', error);
        return NextResponse.json(
            { error: 'Failed to update pattern' },
            { status: 500 }
        );
    }
}

// DELETE: Delete pattern
export async function DELETE(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params;
        const user = await currentUser();

        if (!user) {
            return NextResponse.json(
                { error: 'Authentication required' },
                { status: 401 }
            );
        }

        // Verify ownership and delete
        const result = await db
            .delete(patterns)
            .where(and(
                eq(patterns.id, id),
                eq(patterns.userId, user.id)
            ))
            .returning();

        if (result.length === 0) {
            return NextResponse.json(
                { error: 'Pattern not found or not authorized' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            message: 'Pattern deleted',
        });

    } catch (error) {
        console.error('Error deleting pattern:', error);
        return NextResponse.json(
            { error: 'Failed to delete pattern' },
            { status: 500 }
        );
    }
}
