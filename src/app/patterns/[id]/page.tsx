'use client';

/**
 * Pattern Detail Page
 * View a single pattern with 3D preview and full instructions
 */

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { MeshData } from '@/lib/three/MeshGenerator';
import { FormattedPattern } from '@/lib/crochet/pattern-generator';

const PatternViewer = dynamic(
    () => import('@/components/PatternViewer').then(mod => mod.PatternViewer),
    { ssr: false }
);

interface PatternData {
    id: string;
    title: string;
    description: string | null;
    shapeType: string;
    prompt: string;
    status: string;
    instructions: FormattedPattern;
    meshData: MeshData;
    colors: string[];
    dimensions: {
        width: number;
        height: number;
        totalRows: number;
        totalStitches: number;
    };
    createdAt: string;
    user: {
        firstName: string | null;
        lastName: string | null;
        imageUrl: string | null;
    } | null;
}

export default function PatternDetailPage() {
    const params = useParams();
    const [pattern, setPattern] = useState<PatternData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function loadPattern() {
            try {
                const response = await fetch(`/api/patterns/${params.id}`);
                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || 'Pattern not found');
                }

                setPattern(data.pattern);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load pattern');
            } finally {
                setLoading(false);
            }
        }

        if (params.id) {
            loadPattern();
        }
    }, [params.id]);

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-slate-600 border-t-pink-500 rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-slate-400">Loading pattern...</p>
                </div>
            </div>
        );
    }

    if (error || !pattern) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
                <div className="text-center">
                    <p className="text-red-400 text-xl mb-4">{error || 'Pattern not found'}</p>
                    <Link href="/gallery" className="text-pink-400 hover:underline">
                        ← Back to Gallery
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
                <div className="max-w-6xl mx-auto">
                    {/* Breadcrumb */}
                    <div className="mb-6">
                        <Link href="/gallery" className="text-slate-400 hover:text-white transition-colors">
                            ← Back to Gallery
                        </Link>
                    </div>

                    {/* Header */}
                    <div className="mb-8">
                        <h1 className="text-4xl font-bold text-white mb-2">{pattern.title}</h1>
                        {pattern.description && (
                            <p className="text-slate-400 text-lg">{pattern.description}</p>
                        )}
                        <div className="flex flex-wrap gap-3 mt-4">
                            <span className="px-3 py-1 rounded-full bg-purple-500/30 text-purple-200 text-sm capitalize">
                                {pattern.shapeType}
                            </span>
                            <span className="px-3 py-1 rounded-full bg-blue-500/30 text-blue-200 text-sm">
                                {pattern.dimensions.totalRows} rows
                            </span>
                            <span className="px-3 py-1 rounded-full bg-green-500/30 text-green-200 text-sm">
                                ~{pattern.dimensions.totalStitches} stitches
                            </span>
                        </div>
                    </div>

                    <div className="grid lg:grid-cols-2 gap-8">
                        {/* 3D Preview */}
                        <div>
                            <h2 className="text-xl font-semibold text-white mb-4">3D Preview</h2>
                            <PatternViewer meshData={pattern.meshData} autoRotate showGrid />

                            {/* Colors */}
                            <div className="mt-4 p-4 rounded-xl bg-white/5 border border-white/10">
                                <h4 className="text-sm font-medium text-slate-400 mb-2">Colors</h4>
                                <div className="flex gap-2">
                                    {pattern.colors.map((color, i) => (
                                        <div key={i} className="flex items-center gap-2">
                                            <span
                                                className="w-8 h-8 rounded-lg"
                                                style={{ backgroundColor: color }}
                                            />
                                            <span className="text-sm text-slate-300">{color}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Original Prompt */}
                            <div className="mt-4 p-4 rounded-xl bg-white/5 border border-white/10">
                                <h4 className="text-sm font-medium text-slate-400 mb-2">Original Prompt</h4>
                                <p className="text-slate-300 italic">&quot;{pattern.prompt}&quot;</p>
                            </div>
                        </div>

                        {/* Pattern Instructions */}
                        <div>
                            <h2 className="text-xl font-semibold text-white mb-4">Pattern Instructions</h2>
                            <div className="p-6 rounded-xl bg-white/5 border border-white/10 max-h-[700px] overflow-y-auto">
                                {/* Materials */}
                                <div className="mb-6">
                                    <h4 className="text-sm font-semibold text-pink-400 uppercase tracking-wide mb-2">
                                        Materials
                                    </h4>
                                    <ul className="text-slate-300 text-sm space-y-1">
                                        {pattern.instructions.materials.map((m, i) => (
                                            <li key={i}>• {m}</li>
                                        ))}
                                    </ul>
                                </div>

                                {/* Abbreviations */}
                                <div className="mb-6">
                                    <h4 className="text-sm font-semibold text-pink-400 uppercase tracking-wide mb-2">
                                        Abbreviations
                                    </h4>
                                    <div className="flex flex-wrap gap-2">
                                        {pattern.instructions.abbreviations.map((a, i) => (
                                            <span key={i} className="px-2 py-1 rounded bg-slate-700 text-slate-300 text-xs">
                                                <strong>{a.abbr}</strong> = {a.meaning}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                {/* Instructions */}
                                <div className="mb-6">
                                    <h4 className="text-sm font-semibold text-pink-400 uppercase tracking-wide mb-2">
                                        Instructions
                                    </h4>
                                    <div className="text-slate-300 text-sm space-y-2">
                                        {pattern.instructions.instructions.map((inst, i) => (
                                            <p key={i} dangerouslySetInnerHTML={{
                                                __html: inst.replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>')
                                            }} />
                                        ))}
                                    </div>
                                </div>

                                {/* Notes */}
                                <div>
                                    <h4 className="text-sm font-semibold text-pink-400 uppercase tracking-wide mb-2">
                                        Notes
                                    </h4>
                                    <ul className="text-slate-400 text-sm space-y-1">
                                        {pattern.instructions.notes.map((n, i) => (
                                            <li key={i}>• {n}</li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
