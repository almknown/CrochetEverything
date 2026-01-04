/**
 * Pattern Validator
 * Ensures generated patterns are mathematically valid and executable
 */

import { CalculatedPattern, RowInstruction } from './shape-calculators';

export interface ValidationResult {
    isValid: boolean;
    errors: string[];
    warnings: string[];
}

/**
 * Validate a calculated pattern for mathematical correctness
 */
export function validatePattern(pattern: CalculatedPattern): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for empty pattern
    if (pattern.rows.length === 0) {
        errors.push('Pattern has no rows');
        return { isValid: false, errors, warnings };
    }

    // Validate row consistency
    for (let i = 1; i < pattern.rows.length; i++) {
        const prevRow = pattern.rows[i - 1];
        const currentRow = pattern.rows[i];

        // For flat pieces working in rows (rectangle, triangle)
        if (pattern.shape === 'rectangle') {
            // After foundation chain, all rows should have same stitch count
            if (i > 1 && currentRow.stitchCount !== prevRow.stitchCount) {
                errors.push(
                    `Row ${currentRow.rowNumber}: Stitch count mismatch. ` +
                    `Expected ${prevRow.stitchCount}, got ${currentRow.stitchCount}`
                );
            }
        }

        // For shapes worked in the round (circle, hexagon)
        if (pattern.shape === 'circle' || pattern.shape === 'hexagon') {
            // Stitch count should increase by 6 each round
            const expectedIncrease = 6;
            const actualIncrease = currentRow.stitchCount - prevRow.stitchCount;

            if (i > 0 && actualIncrease !== expectedIncrease) {
                warnings.push(
                    `Round ${currentRow.rowNumber}: Non-standard increase rate. ` +
                    `Expected +${expectedIncrease}, got +${actualIncrease}`
                );
            }
        }

        // Validate stitch breakdown matches total
        const breakdownTotal = currentRow.stitchBreakdown
            .filter(s => !['ch', 'sl_st', 'mr'].includes(s.stitch))
            .reduce((sum, s) => {
                // Increases count as 2 stitches output
                if (s.stitch === 'inc') return sum + s.count * 2;
                // Decreases count as 1 stitch output
                if (s.stitch === 'dec') return sum + s.count;
                return sum + s.count;
            }, 0);

        // Allow some tolerance for complex patterns
        const tolerance = Math.ceil(currentRow.stitchCount * 0.1);
        if (Math.abs(breakdownTotal - currentRow.stitchCount) > tolerance) {
            warnings.push(
                `Row ${currentRow.rowNumber}: Stitch breakdown total (${breakdownTotal}) ` +
                `differs significantly from declared count (${currentRow.stitchCount})`
            );
        }
    }

    // Validate total stitch count
    const calculatedTotal = pattern.rows.reduce((sum, row) => sum + row.stitchCount, 0);
    if (Math.abs(calculatedTotal - pattern.totalStitches) > pattern.rows.length) {
        warnings.push(
            `Total stitch count mismatch: declared ${pattern.totalStitches}, calculated ${calculatedTotal}`
        );
    }

    // Validate row numbers are sequential
    for (let i = 0; i < pattern.rows.length; i++) {
        if (pattern.rows[i].rowNumber !== i) {
            // Row numbers can start at 0 (foundation) or 1
            const expectedRowNum = i;
            const actualRowNum = pattern.rows[i].rowNumber;
            if (actualRowNum !== expectedRowNum && actualRowNum !== expectedRowNum + 1) {
                warnings.push(`Non-sequential row numbering at index ${i}`);
            }
        }
    }

    return {
        isValid: errors.length === 0,
        errors,
        warnings,
    };
}

/**
 * Validate that a pattern spec from AI is within acceptable bounds
 */
export function validatePatternSpec(spec: {
    shape: string;
    dimensions: { width?: number; height?: number };
}): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate shape type
    const validShapes = ['rectangle', 'circle', 'triangle', 'hexagon', 'oval'];
    if (!validShapes.includes(spec.shape)) {
        errors.push(`Invalid shape type: ${spec.shape}. Valid shapes: ${validShapes.join(', ')}`);
    }

    // Validate dimensions
    const { width, height } = spec.dimensions;

    if (width !== undefined) {
        if (width < 1) errors.push('Width must be at least 1');
        if (width > 200) errors.push('Width exceeds maximum (200)');
        if (width > 100) warnings.push('Very wide pattern - may be difficult to crochet');
    }

    if (height !== undefined) {
        if (height < 1) errors.push('Height must be at least 1');
        if (height > 200) errors.push('Height exceeds maximum (200)');
        if (height > 100) warnings.push('Very tall pattern - may take significant time');
    }

    // Shape-specific validation
    if (spec.shape === 'circle' || spec.shape === 'hexagon') {
        if (!height || height < 2) {
            errors.push('Circular shapes require at least 2 rounds');
        }
    }

    if (spec.shape === 'rectangle' || spec.shape === 'oval') {
        if (!width || !height) {
            errors.push('Rectangles and ovals require both width and height');
        }
    }

    return {
        isValid: errors.length === 0,
        errors,
        warnings,
    };
}
