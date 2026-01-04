/**
 * Crochet Shape Calculators
 * Mathematically correct stitch count calculations for each shape type
 */

import { ROUND_START_STITCHES, FLAT_INCREASE_RATE } from './stitch-constants';

export type ShapeType = 'rectangle' | 'circle' | 'triangle' | 'hexagon' | 'oval';

export interface ShapeSpec {
    type: ShapeType;
    width: number;      // Target width in stitch units
    height: number;     // Target height in row/round units
}

export interface RowInstruction {
    rowNumber: number;
    stitchCount: number;
    instructions: string;
    stitchBreakdown: { stitch: string; count: number }[];
}

export interface CalculatedPattern {
    shape: ShapeType;
    totalRows: number;
    totalStitches: number;
    rows: RowInstruction[];
}

/**
 * Calculate stitch pattern for a rectangle
 * Simple rows with consistent stitch count
 */
export function calculateRectangle(width: number, height: number): CalculatedPattern {
    const stitchesPerRow = Math.max(1, Math.round(width));
    const totalRows = Math.max(1, Math.round(height));
    const rows: RowInstruction[] = [];

    // Foundation chain (row 0)
    rows.push({
        rowNumber: 0,
        stitchCount: stitchesPerRow + 1,
        instructions: `Ch ${stitchesPerRow + 1}`,
        stitchBreakdown: [{ stitch: 'ch', count: stitchesPerRow + 1 }],
    });

    // First row
    rows.push({
        rowNumber: 1,
        stitchCount: stitchesPerRow,
        instructions: `Sc in 2nd ch from hook, sc across. (${stitchesPerRow} sc)`,
        stitchBreakdown: [{ stitch: 'sc', count: stitchesPerRow }],
    });

    // Remaining rows
    for (let i = 2; i <= totalRows; i++) {
        rows.push({
            rowNumber: i,
            stitchCount: stitchesPerRow,
            instructions: `Ch 1, turn. Sc across. (${stitchesPerRow} sc)`,
            stitchBreakdown: [
                { stitch: 'ch', count: 1 },
                { stitch: 'sc', count: stitchesPerRow },
            ],
        });
    }

    return {
        shape: 'rectangle',
        totalRows,
        totalStitches: stitchesPerRow * totalRows + stitchesPerRow + 1,
        rows,
    };
}

/**
 * Calculate stitch pattern for a flat circle
 * Uses the standard 6-stitch magic ring with +6 increases per round
 */
export function calculateCircle(targetRounds: number): CalculatedPattern {
    const startStitches = ROUND_START_STITCHES.circle;
    const increaseRate = FLAT_INCREASE_RATE.circle;
    const rows: RowInstruction[] = [];
    let totalStitches = 0;

    // Round 1: Magic ring
    rows.push({
        rowNumber: 1,
        stitchCount: startStitches,
        instructions: `MR, ${startStitches} sc into ring, sl st to join. (${startStitches} sc)`,
        stitchBreakdown: [
            { stitch: 'mr', count: 1 },
            { stitch: 'sc', count: startStitches },
            { stitch: 'sl_st', count: 1 },
        ],
    });
    totalStitches += startStitches;

    // Round 2: All increases
    const round2Count = startStitches * 2;
    rows.push({
        rowNumber: 2,
        stitchCount: round2Count,
        instructions: `Inc in each st around, sl st to join. (${round2Count} sc)`,
        stitchBreakdown: [
            { stitch: 'inc', count: startStitches },
            { stitch: 'sl_st', count: 1 },
        ],
    });
    totalStitches += round2Count;

    // Remaining rounds with distributed increases
    for (let round = 3; round <= targetRounds; round++) {
        const prevCount = startStitches * (round - 1);
        const currentCount = startStitches * round;
        const scBetween = round - 2;

        // Stagger increases for rounder shape (offset pattern)
        const isOddRound = round % 2 === 1;
        let instructions: string;

        if (isOddRound) {
            instructions = `[Sc ${scBetween}, inc] × ${increaseRate}, sl st to join. (${currentCount} sc)`;
        } else {
            // Offset for even rounds
            const halfSc = Math.floor(scBetween / 2);
            const remainingSc = scBetween - halfSc;
            instructions = `Sc ${halfSc}, [inc, sc ${scBetween}] × ${increaseRate - 1}, inc, sc ${remainingSc}, sl st to join. (${currentCount} sc)`;
        }

        rows.push({
            rowNumber: round,
            stitchCount: currentCount,
            instructions,
            stitchBreakdown: [
                { stitch: 'sc', count: currentCount - increaseRate },
                { stitch: 'inc', count: increaseRate },
                { stitch: 'sl_st', count: 1 },
            ],
        });
        totalStitches += currentCount;
    }

    return {
        shape: 'circle',
        totalRows: targetRounds,
        totalStitches,
        rows,
    };
}

/**
 * Calculate stitch pattern for a triangle
 * Increases from point to base
 */
export function calculateTriangle(baseWidth: number): CalculatedPattern {
    const rows: RowInstruction[] = [];
    let totalStitches = 0;

    // Foundation chain
    rows.push({
        rowNumber: 0,
        stitchCount: 2,
        instructions: 'Ch 2',
        stitchBreakdown: [{ stitch: 'ch', count: 2 }],
    });
    totalStitches += 2;

    // Row 1: Start at the point
    rows.push({
        rowNumber: 1,
        stitchCount: 1,
        instructions: 'Sc in 2nd ch from hook. (1 sc)',
        stitchBreakdown: [{ stitch: 'sc', count: 1 }],
    });
    totalStitches += 1;

    // Increase rows until we reach target width
    for (let row = 2; row <= baseWidth; row++) {
        rows.push({
            rowNumber: row,
            stitchCount: row,
            instructions: `Ch 1, turn. Inc, sc ${row - 2 > 0 ? row - 2 : ''}, ${row > 2 ? 'inc' : 'sc 1'}. (${row} sc)`,
            stitchBreakdown: [
                { stitch: 'ch', count: 1 },
                { stitch: 'inc', count: row > 2 ? 2 : 1 },
                { stitch: 'sc', count: Math.max(0, row - 2) },
            ],
        });
        totalStitches += row;
    }

    return {
        shape: 'triangle',
        totalRows: baseWidth,
        totalStitches,
        rows,
    };
}

/**
 * Calculate stitch pattern for a hexagon
 * Like a circle but with grouped increases at 6 points
 */
export function calculateHexagon(targetRounds: number): CalculatedPattern {
    const startStitches = 6;
    const rows: RowInstruction[] = [];
    let totalStitches = 0;

    // Round 1: Magic ring
    rows.push({
        rowNumber: 1,
        stitchCount: startStitches,
        instructions: `MR, ${startStitches} sc into ring, sl st to join. (${startStitches} sc)`,
        stitchBreakdown: [
            { stitch: 'mr', count: 1 },
            { stitch: 'sc', count: startStitches },
            { stitch: 'sl_st', count: 1 },
        ],
    });
    totalStitches += startStitches;

    // Round 2: All increases
    rows.push({
        rowNumber: 2,
        stitchCount: 12,
        instructions: 'Inc in each st around, sl st to join. (12 sc)',
        stitchBreakdown: [
            { stitch: 'inc', count: 6 },
            { stitch: 'sl_st', count: 1 },
        ],
    });
    totalStitches += 12;

    // Remaining rounds - increases at corners only
    for (let round = 3; round <= targetRounds; round++) {
        const currentCount = 6 * round;
        const sideSc = round - 2;

        rows.push({
            rowNumber: round,
            stitchCount: currentCount,
            instructions: `[Sc ${sideSc}, inc] × 6, sl st to join. (${currentCount} sc)`,
            stitchBreakdown: [
                { stitch: 'sc', count: currentCount - 6 },
                { stitch: 'inc', count: 6 },
                { stitch: 'sl_st', count: 1 },
            ],
        });
        totalStitches += currentCount;
    }

    return {
        shape: 'hexagon',
        totalRows: targetRounds,
        totalStitches,
        rows,
    };
}

/**
 * Calculate stitch pattern for an oval
 * Chain center with increases at each end
 */
export function calculateOval(length: number, width: number): CalculatedPattern {
    const centerChainLength = Math.max(1, Math.round(length - width));
    const roundsNeeded = Math.max(2, Math.round(width / 2));
    const rows: RowInstruction[] = [];
    let totalStitches = 0;

    // Foundation chain
    rows.push({
        rowNumber: 0,
        stitchCount: centerChainLength + 1,
        instructions: `Ch ${centerChainLength + 1}`,
        stitchBreakdown: [{ stitch: 'ch', count: centerChainLength + 1 }],
    });
    totalStitches += centerChainLength + 1;

    // Round 1: Work around the chain
    const round1Count = (centerChainLength * 2) + 6;
    rows.push({
        rowNumber: 1,
        stitchCount: round1Count,
        instructions: `Sc in 2nd ch from hook, sc ${centerChainLength - 1}, 3 sc in last ch, continue on other side: sc ${centerChainLength - 1}, 2 sc in last, sl st to join. (${round1Count} sc)`,
        stitchBreakdown: [
            { stitch: 'sc', count: round1Count },
            { stitch: 'sl_st', count: 1 },
        ],
    });
    totalStitches += round1Count;

    // Subsequent rounds with increases at ends
    for (let round = 2; round <= roundsNeeded; round++) {
        const sideStitches = centerChainLength + (round - 1) * 2;
        const endsInc = 3;
        const currentCount = (sideStitches * 2) + (endsInc * 2 * round);

        rows.push({
            rowNumber: round,
            stitchCount: currentCount,
            instructions: `Sc ${sideStitches}, [inc] × ${endsInc}, sc ${sideStitches}, [inc] × ${endsInc}, sl st to join. (${currentCount} sc)`,
            stitchBreakdown: [
                { stitch: 'sc', count: sideStitches * 2 },
                { stitch: 'inc', count: endsInc * 2 },
                { stitch: 'sl_st', count: 1 },
            ],
        });
        totalStitches += currentCount;
    }

    return {
        shape: 'oval',
        totalRows: roundsNeeded,
        totalStitches,
        rows,
    };
}

/**
 * Main calculator dispatcher
 */
export function calculateShape(spec: ShapeSpec): CalculatedPattern {
    switch (spec.type) {
        case 'rectangle':
            return calculateRectangle(spec.width, spec.height);
        case 'circle':
            return calculateCircle(spec.height); // height = number of rounds
        case 'triangle':
            return calculateTriangle(spec.width); // width = base width
        case 'hexagon':
            return calculateHexagon(spec.height); // height = number of rounds
        case 'oval':
            return calculateOval(spec.width, spec.height);
        default:
            throw new Error(`Unknown shape type: ${spec.type}`);
    }
}
