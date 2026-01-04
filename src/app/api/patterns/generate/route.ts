/**
 * Pattern Generation API
 * POST /api/patterns/generate
 * Generates a crochet pattern from a user prompt
 * Supports both flat patterns and 3D amigurumi
 */

import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { generatePatternFromPrompt, generatePatternDirect, generateAmigurumiSpec } from '@/lib/ai';
import { generateMeshFromPattern, serializeMeshData } from '@/lib/three/MeshGenerator';
import { generateAmigurumiMesh, serializeAmigurumiMesh } from '@/lib/three/AmigurumiMeshGenerator';
import { translateMeshToPattern, formatPatternForUI } from '@/lib/crochet/mesh-to-pattern';

export async function POST(request: NextRequest) {
    try {
        // Verify authentication
        const user = await currentUser();
        if (!user) {
            return NextResponse.json(
                { error: 'Authentication required' },
                { status: 401 }
            );
        }

        const body = await request.json();
        const { prompt, directSpec, mode = 'flat' } = body;

        // Validate input
        if (!prompt && !directSpec) {
            return NextResponse.json(
                { error: 'Either prompt or directSpec is required' },
                { status: 400 }
            );
        }

        // ============================================
        // AMIGURUMI MODE - 3D stuffed toys
        // ============================================
        if (mode === 'amigurumi') {
            if (!prompt) {
                return NextResponse.json(
                    { error: 'Prompt is required for amigurumi mode' },
                    { status: 400 }
                );
            }

            // Generate amigurumi spec from AI
            const amigurumiSpec = await generateAmigurumiSpec(prompt);

            // Generate 3D mesh with yarn-level detail
            const meshData = generateAmigurumiMesh(amigurumiSpec);

            // Translate mesh to pattern instructions
            const patternData = translateMeshToPattern(amigurumiSpec, meshData);
            const formatted = formatPatternForUI(patternData);

            // Return amigurumi response with full instructions
            return NextResponse.json({
                success: true,
                mode: 'amigurumi',
                pattern: {
                    title: amigurumiSpec.name,
                    description: amigurumiSpec.description,
                    prompt,
                    shapeType: 'amigurumi',
                    difficulty: amigurumiSpec.difficulty,
                    estimatedTime: amigurumiSpec.estimatedTime,
                },
                amigurumiSpec,
                meshData,
                serializedMesh: serializeAmigurumiMesh(meshData),
                parts: amigurumiSpec.parts,
                assembly: amigurumiSpec.assembly,
                materials: amigurumiSpec.materials,
                formatted,
                patternData,
            });
        }

        // ============================================
        // FLAT MODE - 2D patterns (original behavior)
        // ============================================
        let result;

        if (directSpec) {
            // Direct specification (skips AI)
            const { shape, width, height, title, colors, description } = directSpec;
            result = {
                success: true,
                aiSpec: {
                    title,
                    shape,
                    dimensions: { width, height },
                    colors: colors || ['#F5DEB3'],
                    description: description || '',
                    suggestedUses: [],
                },
                patternResult: generatePatternDirect(shape, width, height, title, colors, description),
                inputValidation: { isValid: true, sanitizedPrompt: '' },
            };
        } else {
            // AI-powered generation
            result = await generatePatternFromPrompt(prompt);
        }

        if (!result.success) {
            return NextResponse.json(
                {
                    error: result.error || 'Pattern generation failed',
                    inputValidation: result.inputValidation,
                    outputValidation: result.outputValidation,
                },
                { status: 400 }
            );
        }

        // Generate 3D mesh data
        const meshData = generateMeshFromPattern(
            result.patternResult!.pattern!,
            result.aiSpec?.colors
        );

        // Prepare response data
        const patternData = {
            title: result.aiSpec!.title,
            description: result.aiSpec!.description,
            prompt: prompt || `Direct: ${directSpec.title}`,
            shapeType: result.aiSpec!.shape,
            instructions: JSON.stringify(result.patternResult!.formatted),
            meshData: serializeMeshData(meshData),
            colors: JSON.stringify(result.aiSpec!.colors),
            dimensions: JSON.stringify({
                width: result.aiSpec!.dimensions.width,
                height: result.aiSpec!.dimensions.height,
                totalRows: result.patternResult!.pattern!.totalRows,
                totalStitches: result.patternResult!.pattern!.totalStitches,
            }),
        };

        return NextResponse.json({
            success: true,
            mode: 'flat',
            pattern: patternData,
            calculated: result.patternResult!.pattern,
            formatted: result.patternResult!.formatted,
            meshData,
            aiSpec: result.aiSpec,
            validation: result.patternResult!.validation,
        });

    } catch (error) {
        console.error('Pattern generation error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Internal server error' },
            { status: 500 }
        );
    }
}
