/**
 * Gallery Page
 * Browse public patterns
 */

// Force dynamic rendering - requires database at runtime
export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { db } from '@/lib/db';
import { patterns } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';

interface GalleryPattern {
    id: string;
    title: string;
    description: string | null;
    shapeType: string;
    colors: string[];
    dimensions: { totalRows?: number; totalStitches?: number } | null;
    createdAt: Date;
    user: {
        firstName: string | null;
        lastName: string | null;
    } | null;
}

async function getPublicPatterns(): Promise<GalleryPattern[]> {
    try {
        const publicPatterns = await db.query.patterns.findMany({
            where: eq(patterns.status, 'published'),
            orderBy: [desc(patterns.createdAt)],
            limit: 50,
            with: {
                user: {
                    columns: {
                        firstName: true,
                        lastName: true,
                    },
                },
            },
        });

        return publicPatterns.map(p => ({
            id: p.id,
            title: p.title,
            description: p.description,
            shapeType: p.shapeType,
            colors: p.colors ? JSON.parse(p.colors) : ['#F5DEB3'],
            dimensions: p.dimensions ? JSON.parse(p.dimensions) : null,
            createdAt: p.createdAt,
            user: p.user,
        }));
    } catch (error) {
        console.error('Error fetching patterns:', error);
        return [];
    }
}

function ShapeIcon({ shape }: { shape: string }) {
    const icons: Record<string, string> = {
        circle: '⭕',
        rectangle: '⬜',
        triangle: '🔺',
        hexagon: '⬡',
        oval: '🥚',
    };
    return <span className="text-xl">{icons[shape] || '🧶'}</span>;
}

export default async function GalleryPage() {
    const publicPatterns = await getPublicPatterns();

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
            {/* Navigation */}
            <nav className="fixed top-0 w-full z-50 backdrop-blur-md bg-slate-900/70 border-b border-white/10">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <Link href="/" className="text-2xl font-bold bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
                        🧶 CrochetAI
                    </Link>
                    <div className="flex items-center gap-6">
                        <Link href="/gallery" className="text-white font-medium">
                            Gallery
                        </Link>
                        <Link
                            href="/generate"
                            className="px-5 py-2 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 text-white font-medium hover:opacity-90 transition-opacity"
                        >
                            Create New
                        </Link>
                    </div>
                </div>
            </nav>

            <main className="pt-24 pb-16 px-6">
                <div className="max-w-7xl mx-auto">
                    <h1 className="text-4xl font-bold text-white text-center mb-2">
                        Pattern Gallery
                    </h1>
                    <p className="text-slate-400 text-center mb-10">
                        Browse patterns created by the community
                    </p>

                    {publicPatterns.length === 0 ? (
                        <div className="text-center py-20">
                            <p className="text-slate-400 text-lg mb-6">No patterns yet. Be the first to create one!</p>
                            <Link
                                href="/generate"
                                className="inline-flex px-6 py-3 rounded-xl bg-gradient-to-r from-pink-500 to-purple-500 text-white font-medium"
                            >
                                Create a Pattern
                            </Link>
                        </div>
                    ) : (
                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {publicPatterns.map((pattern) => (
                                <Link
                                    key={pattern.id}
                                    href={`/patterns/${pattern.id}`}
                                    className="group block p-5 rounded-2xl bg-white/5 border border-white/10 hover:border-pink-500/50 transition-all hover:bg-white/10"
                                >
                                    {/* Color preview bar */}
                                    <div className="h-24 rounded-xl mb-4 flex items-center justify-center overflow-hidden"
                                        style={{
                                            background: pattern.colors.length > 1
                                                ? `linear-gradient(135deg, ${pattern.colors.join(', ')})`
                                                : pattern.colors[0]
                                        }}>
                                        <ShapeIcon shape={pattern.shapeType} />
                                    </div>

                                    <h3 className="text-lg font-semibold text-white mb-1 group-hover:text-pink-300 transition-colors">
                                        {pattern.title}
                                    </h3>

                                    {pattern.description && (
                                        <p className="text-sm text-slate-400 mb-3 line-clamp-2">
                                            {pattern.description}
                                        </p>
                                    )}

                                    <div className="flex items-center justify-between text-xs text-slate-500">
                                        <span className="px-2 py-1 rounded bg-white/10 capitalize">
                                            {pattern.shapeType}
                                        </span>
                                        {pattern.dimensions && (
                                            <span>{pattern.dimensions.totalRows} rows</span>
                                        )}
                                    </div>

                                    {pattern.user && (
                                        <p className="mt-3 text-xs text-slate-500">
                                            by {pattern.user.firstName || 'Anonymous'}
                                        </p>
                                    )}
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
