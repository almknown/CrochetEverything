/**
 * Crochet Engine - Main Export
 * Central access point for all crochet pattern generation functionality
 */

export * from './stitch-constants';
export * from './shape-calculators';
export * from './pattern-validator';
export * from './pattern-generator';
export * from './mesh-to-pattern';

import { calculateShape, ShapeSpec, CalculatedPattern } from './shape-calculators';
import { validatePattern, validatePatternSpec, ValidationResult } from './pattern-validator';
import { generatePatternInstructions, formatPatternAsText, FormattedPattern } from './pattern-generator';

/**
 * Complete pattern generation result
 */
export interface PatternResult {
    success: boolean;
    pattern?: CalculatedPattern;
    formatted?: FormattedPattern;
    validation: ValidationResult;
    error?: string;
}

/**
 * Generate a complete crochet pattern from a shape specification
 * This is the main entry point for the crochet engine
 */
export function generateCrochetPattern(
    spec: ShapeSpec,
    title: string,
    colors?: string[],
    description?: string
): PatternResult {
    // First validate the spec
    const specValidation = validatePatternSpec({
        shape: spec.type,
        dimensions: { width: spec.width, height: spec.height },
    });

    if (!specValidation.isValid) {
        return {
            success: false,
            validation: specValidation,
            error: specValidation.errors.join('; '),
        };
    }

    try {
        // Calculate the pattern
        const pattern = calculateShape(spec);

        // Validate the calculated pattern
        const patternValidation = validatePattern(pattern);

        if (!patternValidation.isValid) {
            return {
                success: false,
                pattern,
                validation: patternValidation,
                error: patternValidation.errors.join('; '),
            };
        }

        // Generate formatted instructions
        const formatted = generatePatternInstructions(pattern, title, colors, description);

        return {
            success: true,
            pattern,
            formatted,
            validation: {
                isValid: true,
                errors: [],
                warnings: [...specValidation.warnings, ...patternValidation.warnings],
            },
        };
    } catch (error) {
        return {
            success: false,
            validation: {
                isValid: false,
                errors: [error instanceof Error ? error.message : 'Unknown error'],
                warnings: [],
            },
            error: error instanceof Error ? error.message : 'Pattern generation failed',
        };
    }
}

/**
 * Quick helper to generate pattern text from spec
 */
export function quickPatternText(
    shapeType: ShapeSpec['type'],
    width: number,
    height: number,
    title: string
): string {
    const result = generateCrochetPattern({ type: shapeType, width, height }, title);

    if (!result.success || !result.formatted) {
        return `Error: ${result.error || 'Failed to generate pattern'}`;
    }

    return formatPatternAsText(result.formatted);
}
