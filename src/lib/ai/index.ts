/**
 * AI Integration - Main Export
 * Unified interface for AI-powered pattern generation
 */

export * from './gemini-client';
export * from './prompt-templates';
export * from './guardrails';
export * from './amigurumi-prompts';

import { generatePatternSpec, AIPatternSpec } from './gemini-client';
import { validateInput, validateOutput, applyDefaults, InputValidationResult, OutputValidationResult } from './guardrails';
import { generateCrochetPattern, PatternResult } from '../crochet';

/**
 * Complete AI-to-Pattern pipeline result
 */
export interface AIGenerationResult {
    success: boolean;
    aiSpec?: AIPatternSpec;
    patternResult?: PatternResult;
    inputValidation: InputValidationResult;
    outputValidation?: OutputValidationResult;
    error?: string;
}

/**
 * Full pipeline: User Prompt → AI Spec → Math Engine → Pattern
 * This is the main entry point for the Text-to-Reality engine
 */
export async function generatePatternFromPrompt(userPrompt: string): Promise<AIGenerationResult> {
    // Step 1: Validate and sanitize input
    const inputValidation = validateInput(userPrompt);

    if (!inputValidation.isValid) {
        return {
            success: false,
            inputValidation,
            error: inputValidation.error,
        };
    }

    try {
        // Step 2: Call AI to generate pattern specification
        const rawSpec = await generatePatternSpec(inputValidation.sanitizedPrompt);

        // Step 3: Validate AI output
        const outputValidation = validateOutput(rawSpec);

        if (!outputValidation.isValid) {
            // Try to salvage with defaults
            const fallbackSpec = applyDefaults(rawSpec);
            const fallbackValidation = validateOutput(fallbackSpec);

            if (!fallbackValidation.isValid) {
                return {
                    success: false,
                    inputValidation,
                    outputValidation,
                    error: `AI output validation failed: ${outputValidation.errors.join(', ')}`,
                };
            }

            // Use fallback spec
            outputValidation.spec = fallbackSpec;
        }

        const aiSpec = outputValidation.spec!;

        // Step 4: Generate pattern using math engine
        const patternResult = generateCrochetPattern(
            {
                type: aiSpec.shape,
                width: aiSpec.dimensions.width,
                height: aiSpec.dimensions.height,
            },
            aiSpec.title,
            aiSpec.colors,
            aiSpec.description
        );

        if (!patternResult.success) {
            return {
                success: false,
                aiSpec,
                patternResult,
                inputValidation,
                outputValidation,
                error: patternResult.error,
            };
        }

        // Success!
        return {
            success: true,
            aiSpec,
            patternResult,
            inputValidation,
            outputValidation,
        };

    } catch (error) {
        return {
            success: false,
            inputValidation,
            error: error instanceof Error ? error.message : 'An unexpected error occurred',
        };
    }
}

/**
 * Generate pattern without AI (direct specification)
 * Useful for testing or when user specifies exact parameters
 */
export function generatePatternDirect(
    shape: AIPatternSpec['shape'],
    width: number,
    height: number,
    title: string,
    colors?: string[],
    description?: string
): PatternResult {
    return generateCrochetPattern(
        { type: shape, width, height },
        title,
        colors,
        description
    );
}
