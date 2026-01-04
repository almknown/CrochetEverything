'use client';

/**
 * Pattern Generator Page
 * Main interface for generating crochet patterns from prompts
 */

import { useState, useCallback } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { EXAMPLE_PROMPTS } from '@/lib/ai/prompt-templates';
import { AMIGURUMI_EXAMPLE_PROMPTS } from '@/lib/ai/amigurumi-prompts';
import { MeshData } from '@/lib/three/MeshGenerator';
import { AmigurumiMeshData } from '@/lib/three/AmigurumiMeshGenerator';
import { FormattedPattern } from '@/lib/crochet/pattern-generator';
import { downloadPatternPDF } from '@/lib/export/pdf';

// Dynamically import PatternViewer to avoid SSR issues with Three.js
const PatternViewer = dynamic(
    () => import('@/components/PatternViewer').then(mod => mod.PatternViewer),
    {
        ssr: false,
        loading: () => (
            <div className="w-full h-[400px] bg-slate-800 rounded-lg flex items-center justify-center">
                <span className="text-slate-400">Loading 3D viewer...</span>
            </div>
        ),
    }
);

interface GenerationResult {
    mode: 'flat' | 'amigurumi';
    pattern: {
        title: string;
        description: string;
        shapeType: string;
        instructions?: string;
        colors?: string;
        dimensions?: string;
        difficulty?: string;
        estimatedTime?: string;
    };
    formatted?: FormattedPattern;
    meshData: MeshData | AmigurumiMeshData;
    aiSpec?: {
        title: string;
        shape: string;
        colors: string[];
        description: string;
        suggestedUses: string[];
    };
    amigurumiSpec?: {
        name: string;
        description: string;
        parts: { name: string; type: string; color: string }[];
        materials: { colors: { name: string; hex: string }[] };
    };
}

type GenerationMode = 'flat' | 'amigurumi';

export default function GeneratePage() {
    const [prompt, setPrompt] = useState('');
    const [mode, setMode] = useState<GenerationMode>('flat');
    const [isGenerating, setIsGenerating] = useState(false);
    const [result, setResult] = useState<GenerationResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);

    const handleGenerate = useCallback(async () => {
        if (!prompt.trim()) {
            setError('Please enter a description of the pattern you want to create.');
            return;
        }

        setIsGenerating(true);
        setError(null);
        setResult(null);
        setSaveSuccess(false);

        try {
            const response = await fetch('/api/patterns/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt, mode }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Generation failed');
            }

            setResult(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setIsGenerating(false);
        }
    }, [prompt, mode]);

    const handleSave = useCallback(async (status: 'draft' | 'published') => {
        if (!result) return;

        setIsSaving(true);
        setError(null);

        try {
            const response = await fetch('/api/patterns', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: result.pattern.title,
                    description: result.pattern.description,
                    prompt,
                    shapeType: result.pattern.shapeType,
                    status,
                    instructions: result.pattern.instructions,
                    meshData: JSON.stringify(result.meshData),
                    colors: result.pattern.colors,
                    dimensions: result.pattern.dimensions,
                }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to save');
            }

            setSaveSuccess(true);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save pattern');
        } finally {
            setIsSaving(false);
        }
    }, [result, prompt]);

    const handleExampleClick = (example: string) => {
        setPrompt(example);
        setResult(null);
        setError(null);
    };

    const currentExamples = mode === 'amigurumi' ? AMIGURUMI_EXAMPLE_PROMPTS : EXAMPLE_PROMPTS;

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
                        <Link href="/my-patterns" className="text-slate-300 hover:text-white transition-colors">
                            My Patterns
                        </Link>
                    </div>
                </div>
            </nav>

            <main className="pt-24 pb-16 px-6">
                <div className="max-w-6xl mx-auto">
                    <h1 className="text-4xl font-bold text-white text-center mb-2">
                        Pattern Generator
                    </h1>
                    <p className="text-slate-400 text-center mb-10">
                        Describe what you want to create and get a mathematically valid pattern
                    </p>

                    {/* Mode Toggle */}
                    <div className="flex justify-center mb-8">
                        <div className="inline-flex bg-slate-800/50 rounded-xl p-1 border border-white/10">
                            <button
                                onClick={() => { setMode('flat'); setResult(null); }}
                                className={`px-6 py-3 rounded-lg font-medium transition-all ${mode === 'flat'
                                    ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-lg'
                                    : 'text-slate-400 hover:text-white'
                                    }`}
                            >
                                🧣 Flat Patterns
                            </button>
                            <button
                                onClick={() => { setMode('amigurumi'); setResult(null); }}
                                className={`px-6 py-3 rounded-lg font-medium transition-all ${mode === 'amigurumi'
                                    ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-lg'
                                    : 'text-slate-400 hover:text-white'
                                    }`}
                            >
                                🧸 3D Amigurumi
                            </button>
                        </div>
                    </div>

                    {/* Input Section */}
                    <div className="bg-white/5 rounded-2xl border border-white/10 p-6 mb-8">
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            {mode === 'amigurumi'
                                ? 'What amigurumi would you like to create?'
                                : 'What would you like to crochet?'}
                        </label>
                        <textarea
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder={mode === 'amigurumi'
                                ? 'Example: Make me a cute little octopus with curly tentacles'
                                : 'Example: Make me a cozy round coaster for my coffee mug with autumn colors'}
                            className="w-full h-32 px-4 py-3 rounded-xl bg-slate-800/50 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-pink-500 resize-none"
                            disabled={isGenerating}
                        />

                        {/* Example prompts */}
                        <div className="mt-4">
                            <span className="text-sm text-slate-400">Try an example:</span>
                            <div className="flex flex-wrap gap-2 mt-2">
                                {currentExamples.slice(0, 4).map((example, i) => (
                                    <button
                                        key={i}
                                        onClick={() => handleExampleClick(example)}
                                        className="px-3 py-1 text-sm rounded-full bg-white/10 text-slate-300 hover:bg-white/20 transition-colors"
                                    >
                                        {example.slice(0, 40)}...
                                    </button>
                                ))}
                            </div>
                        </div>

                        <button
                            onClick={handleGenerate}
                            disabled={isGenerating || !prompt.trim()}
                            className="mt-6 w-full py-4 rounded-xl bg-gradient-to-r from-pink-500 to-purple-500 text-white font-semibold text-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                        >
                            {isGenerating ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Generating Pattern...
                                </>
                            ) : (
                                '✨ Generate Pattern'
                            )}
                        </button>
                    </div>

                    {/* Error Display */}
                    {error && (
                        <div className="mb-8 p-4 rounded-xl bg-red-500/20 border border-red-500/50 text-red-200">
                            {error}
                        </div>
                    )}

                    {/* Success Message */}
                    {saveSuccess && (
                        <div className="mb-8 p-4 rounded-xl bg-green-500/20 border border-green-500/50 text-green-200">
                            Pattern saved successfully! View it in{' '}
                            <Link href="/my-patterns" className="underline">My Patterns</Link>.
                        </div>
                    )}

                    {/* Results */}
                    {result && (
                        <div className="grid lg:grid-cols-2 gap-8">
                            {/* 3D Preview */}
                            <div>
                                <h2 className="text-xl font-semibold text-white mb-4">3D Preview</h2>
                                <PatternViewer meshData={result.meshData} />

                                {/* Pattern Info */}
                                <div className="mt-4 p-4 rounded-xl bg-white/5 border border-white/10">
                                    <h3 className="text-lg font-semibold text-white mb-2">
                                        {result.mode === 'amigurumi'
                                            ? result.amigurumiSpec?.name || result.pattern.title
                                            : result.aiSpec?.title || result.pattern.title}
                                    </h3>
                                    <p className="text-slate-400 text-sm mb-3">
                                        {result.mode === 'amigurumi'
                                            ? result.amigurumiSpec?.description || result.pattern.description
                                            : result.aiSpec?.description || result.pattern.description}
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        <span className="px-3 py-1 rounded-full bg-purple-500/30 text-purple-200 text-sm">
                                            {result.mode === 'amigurumi' ? '3D Amigurumi' : result.aiSpec?.shape || result.pattern.shapeType}
                                        </span>
                                        {result.mode === 'amigurumi' && result.pattern.difficulty && (
                                            <span className="px-3 py-1 rounded-full bg-blue-500/30 text-blue-200 text-sm">
                                                {result.pattern.difficulty}
                                            </span>
                                        )}
                                        {result.mode === 'amigurumi' && result.pattern.estimatedTime && (
                                            <span className="px-3 py-1 rounded-full bg-green-500/30 text-green-200 text-sm">
                                                ⏱ {result.pattern.estimatedTime}
                                            </span>
                                        )}
                                        {result.mode === 'flat' && result.aiSpec?.colors.map((color, i) => (
                                            <span
                                                key={i}
                                                className="px-3 py-1 rounded-full text-white text-sm flex items-center gap-2"
                                                style={{ backgroundColor: color + '40' }}
                                            >
                                                <span
                                                    className="w-3 h-3 rounded-full"
                                                    style={{ backgroundColor: color }}
                                                />
                                                {color}
                                            </span>
                                        ))}
                                        {result.mode === 'amigurumi' && result.amigurumiSpec?.materials.colors.map((color, i) => (
                                            <span
                                                key={i}
                                                className="px-3 py-1 rounded-full text-white text-sm flex items-center gap-2"
                                                style={{ backgroundColor: color.hex + '40' }}
                                            >
                                                <span
                                                    className="w-3 h-3 rounded-full"
                                                    style={{ backgroundColor: color.hex }}
                                                />
                                                {color.name}
                                            </span>
                                        ))}
                                    </div>
                                    {result.mode === 'amigurumi' && result.amigurumiSpec?.parts && (
                                        <div className="mt-3 pt-3 border-t border-white/10">
                                            <p className="text-slate-400 text-xs uppercase tracking-wide mb-2">Parts</p>
                                            <div className="flex flex-wrap gap-1">
                                                {result.amigurumiSpec.parts.map((part, i) => (
                                                    <span key={i} className="px-2 py-0.5 rounded bg-slate-700 text-slate-300 text-xs">
                                                        {part.name}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Action Buttons */}
                                <div className="mt-4 flex flex-wrap gap-3">
                                    <button
                                        onClick={() => handleSave('published')}
                                        disabled={isSaving || saveSuccess}
                                        className="flex-1 py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white font-medium transition-colors disabled:opacity-50"
                                    >
                                        {isSaving ? 'Saving...' : 'Save & Publish'}
                                    </button>
                                    <button
                                        onClick={() => handleSave('draft')}
                                        disabled={isSaving || saveSuccess}
                                        className="flex-1 py-3 rounded-xl bg-slate-600 hover:bg-slate-700 text-white font-medium transition-colors disabled:opacity-50"
                                    >
                                        Save as Draft
                                    </button>
                                    {result.mode === 'flat' && result.formatted && result.pattern.dimensions && (
                                        <button
                                            onClick={() => {
                                                const dimensions = JSON.parse(result.pattern.dimensions!);
                                                downloadPatternPDF({
                                                    title: result.aiSpec?.title || result.pattern.title,
                                                    description: result.aiSpec?.description || result.pattern.description,
                                                    shape: result.aiSpec?.shape || result.pattern.shapeType,
                                                    dimensions: {
                                                        totalRows: dimensions.totalRows,
                                                        totalStitches: dimensions.totalStitches,
                                                        width: dimensions.width,
                                                        height: dimensions.height,
                                                    },
                                                    colors: result.aiSpec?.colors || ['#F5DEB3'],
                                                    formatted: result.formatted!,
                                                });
                                            }}
                                            className="w-full py-3 rounded-xl bg-pink-600 hover:bg-pink-700 text-white font-medium transition-colors flex items-center justify-center gap-2"
                                        >
                                            📄 Download PDF
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Pattern Instructions - Flat Mode */}
                            {result.mode === 'flat' && result.formatted && (
                                <div>
                                    <h2 className="text-xl font-semibold text-white mb-4">Pattern Instructions</h2>
                                    <div className="p-6 rounded-xl bg-white/5 border border-white/10 max-h-[600px] overflow-y-auto">
                                        {/* Materials */}
                                        <div className="mb-6">
                                            <h4 className="text-sm font-semibold text-pink-400 uppercase tracking-wide mb-2">
                                                Materials
                                            </h4>
                                            <ul className="text-slate-300 text-sm space-y-1">
                                                {result.formatted.materials.map((m, i) => (
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
                                                {result.formatted.abbreviations.map((a, i) => (
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
                                                {result.formatted.instructions.map((inst, i) => (
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
                                                {result.formatted.notes.map((n, i) => (
                                                    <li key={i}>• {n}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Amigurumi Instructions Preview */}
                            {result.mode === 'amigurumi' && result.amigurumiSpec && (
                                <div>
                                    <h2 className="text-xl font-semibold text-white mb-4">Amigurumi Assembly</h2>
                                    <div className="p-6 rounded-xl bg-white/5 border border-white/10 max-h-[600px] overflow-y-auto">
                                        {/* Parts */}
                                        <div className="mb-6">
                                            <h4 className="text-sm font-semibold text-pink-400 uppercase tracking-wide mb-2">
                                                Parts to Make ({result.amigurumiSpec.parts.length})
                                            </h4>
                                            <div className="space-y-2">
                                                {result.amigurumiSpec.parts.map((part, i) => (
                                                    <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-slate-800/50">
                                                        <span
                                                            className="w-4 h-4 rounded-full flex-shrink-0"
                                                            style={{ backgroundColor: part.color }}
                                                        />
                                                        <span className="text-slate-300 text-sm font-medium">{part.name}</span>
                                                        <span className="text-slate-500 text-xs">{part.type}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Materials */}
                                        <div className="mb-6">
                                            <h4 className="text-sm font-semibold text-pink-400 uppercase tracking-wide mb-2">
                                                Materials
                                            </h4>
                                            <ul className="text-slate-300 text-sm space-y-1">
                                                {result.amigurumiSpec.materials.colors.map((c, i) => (
                                                    <li key={i} className="flex items-center gap-2">
                                                        <span
                                                            className="w-3 h-3 rounded-full"
                                                            style={{ backgroundColor: c.hex }}
                                                        />
                                                        {c.name} yarn
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>

                                        {/* Coming Soon Note */}
                                        <div className="p-4 rounded-lg bg-purple-500/20 border border-purple-500/30">
                                            <p className="text-purple-200 text-sm">
                                                🧸 Full row-by-row instructions coming soon! This preview shows the 3D mesh visualization of your amigurumi design.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
