'use client';

/**
 * My Patterns Content Component
 * User's saved patterns - client-only to avoid SSR issues with Clerk hooks
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useUser } from '@clerk/nextjs';

interface UserPattern {
    id: string;
    title: string;
    description: string | null;
    shapeType: string;
    status: 'draft' | 'published' | 'private';
    colors: string[];
    dimensions: { totalRows?: number } | null;
    createdAt: string;
}

export default function MyPatternsContent() {
    const { isLoaded, isSignedIn } = useUser();
    const [patterns, setPatterns] = useState<UserPattern[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function loadPatterns() {
            try {
                const response = await fetch('/api/patterns?filter=mine');
                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || 'Failed to load patterns');
                }

                setPatterns(data.patterns);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load patterns');
            } finally {
                setLoading(false);
            }
        }

        if (isSignedIn) {
            loadPatterns();
        } else if (isLoaded) {
            setLoading(false);
        }
    }, [isLoaded, isSignedIn]);

    const handleStatusChange = async (id: string, newStatus: string) => {
        try {
            const response = await fetch(`/api/patterns/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus }),
            });

            if (response.ok) {
                setPatterns(prev =>
                    prev.map(p => p.id === id ? { ...p, status: newStatus as UserPattern['status'] } : p)
                );
            }
        } catch (err) {
            console.error('Failed to update status:', err);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this pattern?')) return;

        try {
            const response = await fetch(`/api/patterns/${id}`, {
                method: 'DELETE',
            });

            if (response.ok) {
                setPatterns(prev => prev.filter(p => p.id !== id));
            }
        } catch (err) {
            console.error('Failed to delete:', err);
        }
    };

    if (!isLoaded || loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
                <div className="w-16 h-16 border-4 border-slate-600 border-t-pink-500 rounded-full animate-spin" />
            </div>
        );
    }

    if (!isSignedIn) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
                <div className="text-center">
                    <p className="text-slate-400 text-lg mb-4">Please sign in to view your patterns</p>
                    <Link href="/sign-in" className="px-6 py-3 rounded-xl bg-pink-500 text-white font-medium">
                        Sign In
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
            {/* Navigation */}
            <nav className="fixed top-0 w-full z-50 backdrop-blur-md bg-slate-900/70 border-b border-white/10">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <Link href="/" className="text-2xl font-bold bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
                        🧶 CrochetAI
                    </Link>
                    <div className="flex items-center gap-6">
                        <Link href="/gallery" className="text-slate-300 hover:text-white transition-colors">
                            Gallery
                        </Link>
                        <Link href="/my-patterns" className="text-white font-medium">
                            My Patterns
                        </Link>
                        <Link
                            href="/generate"
                            className="px-5 py-2 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 text-white font-medium"
                        >
                            Create New
                        </Link>
                    </div>
                </div>
            </nav>

            <main className="pt-24 pb-16 px-6">
                <div className="max-w-5xl mx-auto">
                    <h1 className="text-4xl font-bold text-white text-center mb-2">
                        My Patterns
                    </h1>
                    <p className="text-slate-400 text-center mb-10">
                        Manage your saved patterns
                    </p>

                    {error && (
                        <div className="mb-8 p-4 rounded-xl bg-red-500/20 border border-red-500/50 text-red-200">
                            {error}
                        </div>
                    )}

                    {patterns.length === 0 ? (
                        <div className="text-center py-20">
                            <p className="text-slate-400 text-lg mb-6">You haven&apos;t created any patterns yet.</p>
                            <Link
                                href="/generate"
                                className="inline-flex px-6 py-3 rounded-xl bg-gradient-to-r from-pink-500 to-purple-500 text-white font-medium"
                            >
                                Create Your First Pattern
                            </Link>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {patterns.map((pattern) => (
                                <div
                                    key={pattern.id}
                                    className="p-5 rounded-xl bg-white/5 border border-white/10 flex items-center gap-6"
                                >
                                    {/* Color preview */}
                                    <div
                                        className="w-16 h-16 rounded-xl flex-shrink-0"
                                        style={{
                                            background: pattern.colors?.length > 1
                                                ? `linear-gradient(135deg, ${pattern.colors.join(', ')})`
                                                : pattern.colors?.[0] || '#F5DEB3'
                                        }}
                                    />

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <Link href={`/patterns/${pattern.id}`} className="text-lg font-semibold text-white hover:text-pink-300 transition-colors">
                                            {pattern.title}
                                        </Link>
                                        <div className="flex items-center gap-3 mt-1 text-sm text-slate-400">
                                            <span className="capitalize">{pattern.shapeType}</span>
                                            {pattern.dimensions && (
                                                <span>{pattern.dimensions.totalRows} rows</span>
                                            )}
                                            <span>{new Date(pattern.createdAt).toLocaleDateString()}</span>
                                        </div>
                                    </div>

                                    {/* Status badge */}
                                    <select
                                        value={pattern.status}
                                        onChange={(e) => handleStatusChange(pattern.id, e.target.value)}
                                        className={`px-3 py-1 rounded-full text-sm font-medium ${pattern.status === 'published' ? 'bg-green-500/30 text-green-200' :
                                            pattern.status === 'private' ? 'bg-yellow-500/30 text-yellow-200' :
                                                'bg-slate-500/30 text-slate-300'
                                            } bg-transparent border-0 cursor-pointer`}
                                    >
                                        <option value="draft">Draft</option>
                                        <option value="published">Published</option>
                                        <option value="private">Private</option>
                                    </select>

                                    {/* Actions */}
                                    <div className="flex gap-2">
                                        <Link
                                            href={`/patterns/${pattern.id}`}
                                            className="px-4 py-2 rounded-lg bg-slate-600 hover:bg-slate-700 text-white text-sm transition-colors"
                                        >
                                            View
                                        </Link>
                                        <button
                                            onClick={() => handleDelete(pattern.id)}
                                            className="px-4 py-2 rounded-lg bg-red-600/30 hover:bg-red-600/50 text-red-200 text-sm transition-colors"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
