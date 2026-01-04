/**
 * Pattern Generator
 * Converts calculated stitch data into human-readable written instructions
 */

import { CalculatedPattern, RowInstruction } from './shape-calculators';
import { STITCH_PROPERTIES, StitchType } from './stitch-constants';

export interface FormattedPattern {
    title: string;
    description: string;
    materials: string[];
    abbreviations: { abbr: string; meaning: string }[];
    instructions: string[];
    notes: string[];
}

/**
 * Generate formatted pattern instructions from calculated data
 */
export function generatePatternInstructions(
    pattern: CalculatedPattern,
    title: string,
    colors: string[] = ['#F5DEB3'], // Default wheat color for yarn
    description?: string
): FormattedPattern {
    const isRoundWork = ['circle', 'hexagon', 'oval'].includes(pattern.shape);

    // Determine materials based on pattern
    const materials = [
        'Worsted weight yarn (approximately 100g)',
        '5.0mm (H/8) crochet hook',
        'Stitch marker',
        'Yarn needle for weaving ends',
    ];

    // Abbreviations used in pattern
    const usedStitches = new Set<StitchType>();
    pattern.rows.forEach(row => {
        row.stitchBreakdown.forEach(s => {
            usedStitches.add(s.stitch as StitchType);
        });
    });

    const abbreviations = Array.from(usedStitches)
        .filter(s => STITCH_PROPERTIES[s])
        .map(s => ({
            abbr: STITCH_PROPERTIES[s].abbreviation,
            meaning: STITCH_PROPERTIES[s].name,
        }));

    // Format row instructions
    const instructions = pattern.rows.map(row => {
        if (isRoundWork) {
            return `**Round ${row.rowNumber}:** ${row.instructions}`;
        } else {
            if (row.rowNumber === 0) {
                return `**Foundation:** ${row.instructions}`;
            }
            return `**Row ${row.rowNumber}:** ${row.instructions}`;
        }
    });

    // Add finishing instructions
    instructions.push('');
    instructions.push('**Finishing:**');
    if (isRoundWork) {
        instructions.push('Fasten off, leaving a 6" tail. Weave in ends.');
    } else {
        instructions.push('Fasten off. Weave in all ends securely.');
    }

    // Generate notes
    const notes: string[] = [
        `Total stitches: approximately ${pattern.totalStitches}`,
        `Total ${isRoundWork ? 'rounds' : 'rows'}: ${pattern.totalRows}`,
    ];

    if (pattern.shape === 'circle' || pattern.shape === 'hexagon') {
        notes.push('Work in continuous rounds unless otherwise specified.');
        notes.push('Use a stitch marker to track the beginning of each round.');
    }

    if (colors.length > 1) {
        notes.push(`Color changes: ${colors.length} colors used.`);
    }

    return {
        title,
        description: description || generateDefaultDescription(pattern),
        materials,
        abbreviations,
        instructions,
        notes,
    };
}

/**
 * Generate a default description based on shape
 */
function generateDefaultDescription(pattern: CalculatedPattern): string {
    const descriptions: Record<string, string> = {
        rectangle: `A flat rectangular piece worked in rows. Perfect for scarves, washcloths, or blanket squares.`,
        circle: `A flat circular motif worked in rounds from the center out. Great for coasters, mandalas, or rug bases.`,
        triangle: `A triangular piece worked from point to base with increases. Ideal for bunting, shawl corners, or decorative elements.`,
        hexagon: `A hexagonal motif with defined corners, worked in rounds. Perfect for blanket hexies or structural pieces.`,
        oval: `An oval shape created by working around a foundation chain. Suitable for rug bases, bag bottoms, or placemats.`,
    };

    return descriptions[pattern.shape] || 'A crocheted piece.';
}

/**
 * Format pattern as plain text for display/export
 */
export function formatPatternAsText(formatted: FormattedPattern): string {
    let output = '';

    // Title
    output += `${'='.repeat(50)}\n`;
    output += `${formatted.title.toUpperCase()}\n`;
    output += `${'='.repeat(50)}\n\n`;

    // Description
    output += `${formatted.description}\n\n`;

    // Materials
    output += `MATERIALS:\n`;
    formatted.materials.forEach(m => {
        output += `• ${m}\n`;
    });
    output += '\n';

    // Abbreviations
    output += `ABBREVIATIONS:\n`;
    formatted.abbreviations.forEach(a => {
        output += `• ${a.abbr} = ${a.meaning}\n`;
    });
    output += '\n';

    // Instructions
    output += `PATTERN INSTRUCTIONS:\n`;
    output += `${'-'.repeat(30)}\n`;
    formatted.instructions.forEach(inst => {
        output += `${inst.replace(/\*\*/g, '')}\n`;
    });
    output += '\n';

    // Notes
    output += `NOTES:\n`;
    formatted.notes.forEach(n => {
        output += `• ${n}\n`;
    });

    return output;
}

/**
 * Export pattern as JSON for storage
 */
export function serializePattern(
    pattern: CalculatedPattern,
    formatted: FormattedPattern
): string {
    return JSON.stringify({
        calculated: pattern,
        formatted,
        version: '1.0',
        generatedAt: new Date().toISOString(),
    });
}
