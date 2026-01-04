/**
 * AI Guardrails
 * Input sanitization and output validation for AI-generated content
 */

import { z } from 'zod';
import { AIPatternSpec } from './gemini-client';

// ============================================
// INPUT GUARDRAILS
// ============================================

/**
 * Blocked keywords that indicate non-crochet requests
 */
const BLOCKED_KEYWORDS = [
    // Technical/code requests
    'code', 'program', 'script', 'function', 'database', 'api', 'html', 'css', 'javascript',
    // Harmful content
    'weapon', 'bomb', 'drug', 'illegal', 'hack', 'steal',
    // Off-topic
    'recipe', 'cooking', 'exercise', 'workout', 'diet',
    // Explicit
    'nsfw', 'adult', 'explicit',
];

/**
 * Keywords that indicate valid crochet requests
 */
const CROCHET_KEYWORDS = [
    'crochet', 'yarn', 'stitch', 'hook', 'blanket', 'scarf', 'coaster', 'amigurumi',
    'granny', 'square', 'circle', 'round', 'pattern', 'mandala', 'doily', 'washcloth',
    'hexagon', 'triangle', 'oval', 'rectangle', 'placemat', 'rug', 'throw', 'pillow',
    'bunting', 'garland', 'motif', 'afghan', 'baby', 'hat', 'beanie', 'pot holder',
];

export interface InputValidationResult {
    isValid: boolean;
    sanitizedPrompt: string;
    error?: string;
    warning?: string;
}

/**
 * Validate and sanitize user input before sending to AI
 */
export function validateInput(rawPrompt: string): InputValidationResult {
    // Basic sanitization
    let prompt = rawPrompt.trim();

    // Check for empty input
    if (!prompt || prompt.length < 3) {
        return {
            isValid: false,
            sanitizedPrompt: '',
            error: 'Please enter a description of the pattern you want to create.',
        };
    }

    // Check for excessive length
    if (prompt.length > 500) {
        prompt = prompt.substring(0, 500);
        return {
            isValid: true,
            sanitizedPrompt: prompt,
            warning: 'Your prompt was truncated to 500 characters.',
        };
    }

    // Convert to lowercase for keyword checking
    const lowerPrompt = prompt.toLowerCase();

    // Check for blocked keywords
    for (const keyword of BLOCKED_KEYWORDS) {
        if (lowerPrompt.includes(keyword)) {
            return {
                isValid: false,
                sanitizedPrompt: '',
                error: `Your request doesn't seem to be about crochet patterns. Please describe a crochet project like a blanket, coaster, or scarf.`,
            };
        }
    }

    // Check if request seems crochet-related
    const hasCrochetKeyword = CROCHET_KEYWORDS.some(kw => lowerPrompt.includes(kw));

    // If no crochet keywords, add a gentle reminder but still process
    let warning: string | undefined;
    if (!hasCrochetKeyword) {
        warning = 'Tip: Be specific about what crochet item you want (e.g., "coaster", "blanket square", "placemat").';
    }

    // Remove any potential injection attempts
    const sanitized = prompt
        .replace(/[<>{}[\]]/g, '') // Remove brackets
        .replace(/\\/g, '')        // Remove backslashes
        .replace(/["'`]/g, "'")    // Normalize quotes
        .trim();

    return {
        isValid: true,
        sanitizedPrompt: sanitized,
        warning,
    };
}

// ============================================
// OUTPUT GUARDRAILS
// ============================================

/**
 * Zod schema for validating AI output
 */
export const PatternSpecSchema = z.object({
    title: z.string().min(1).max(100),
    shape: z.enum(['rectangle', 'circle', 'triangle', 'hexagon', 'oval']),
    dimensions: z.object({
        width: z.number().min(1).max(200),
        height: z.number().min(1).max(200),
    }),
    colors: z.array(z.string().regex(/^#[0-9A-Fa-f]{6}$/)).min(1).max(10),
    description: z.string().max(500),
    suggestedUses: z.array(z.string()).max(10),
});

export interface OutputValidationResult {
    isValid: boolean;
    spec?: AIPatternSpec;
    errors: string[];
}

/**
 * Validate AI output against schema
 */
export function validateOutput(rawOutput: unknown): OutputValidationResult {
    const result = PatternSpecSchema.safeParse(rawOutput);

    if (!result.success) {
        return {
            isValid: false,
            errors: result.error.issues.map(e => `${e.path.join('.')}: ${e.message}`),
        };
    }

    // Additional semantic validation
    const spec = result.data;
    const errors: string[] = [];

    // Shape-specific dimension validation
    if (spec.shape === 'circle' || spec.shape === 'hexagon') {
        if (spec.dimensions.height < 2) {
            errors.push('Circular shapes require at least 2 rounds');
        }
    }

    if (spec.shape === 'oval') {
        if (spec.dimensions.width <= spec.dimensions.height) {
            // Swap to ensure width > height for ovals
            const temp = spec.dimensions.width;
            spec.dimensions.width = spec.dimensions.height;
            spec.dimensions.height = temp;
        }
    }

    // Check for reasonable dimensions
    if (spec.dimensions.width > 100 || spec.dimensions.height > 100) {
        errors.push('Warning: Very large pattern may take significant time to crochet');
    }

    return {
        isValid: errors.filter(e => !e.startsWith('Warning')).length === 0,
        spec: spec as AIPatternSpec,
        errors,
    };
}

/**
 * Apply default fallbacks for missing/invalid fields
 */
export function applyDefaults(spec: Partial<AIPatternSpec>): AIPatternSpec {
    return {
        title: spec.title || 'Untitled Pattern',
        shape: spec.shape || 'circle',
        dimensions: {
            width: spec.dimensions?.width || 10,
            height: spec.dimensions?.height || 10,
        },
        colors: spec.colors?.length ? spec.colors : ['#F5DEB3'],
        description: spec.description || 'A beautiful crocheted piece.',
        suggestedUses: spec.suggestedUses || [],
    };
}
