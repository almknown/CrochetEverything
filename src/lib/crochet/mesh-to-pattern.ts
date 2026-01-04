/**
 * Mesh to Pattern Translator
 * Converts 3D amigurumi mesh data into human-readable crochet instructions
 */

import { AIAmigurumiSpec, AmigurumiPart } from '../ai/amigurumi-prompts';
import { AmigurumiMeshData, PartMeshData } from '../three/AmigurumiMeshGenerator';

/**
 * Generated pattern instructions for an amigurumi part
 */
export interface PartInstructions {
    partName: string;
    color: string;
    rounds: RoundInstruction[];
    totalStitches: number;
    stuffingNote: string;
}

/**
 * Individual round instruction
 */
export interface RoundInstruction {
    roundNumber: number;
    stitchCount: number;
    instruction: string;
    stitchBreakdown: string[];
}

/**
 * Complete amigurumi pattern
 */
export interface AmigurumiPattern {
    name: string;
    description: string;
    difficulty: string;
    estimatedTime: string;
    materials: {
        yarn: string[];
        hook: string;
        extras: string[];
    };
    abbreviations: { abbr: string; meaning: string }[];
    parts: PartInstructions[];
    assembly: string[];
    finishingNotes: string[];
}

// ================================================================
// MAIN TRANSLATOR FUNCTIONS
// ================================================================

/**
 * Generate complete amigurumi pattern from AI spec and mesh data
 */
export function translateMeshToPattern(
    spec: AIAmigurumiSpec,
    meshData: AmigurumiMeshData
): AmigurumiPattern {
    // Generate instructions for each part
    const partInstructions = spec.parts.map((part, index) => {
        const partMesh = meshData.parts[index];
        return generatePartInstructions(part, partMesh);
    });

    // Generate assembly instructions
    const assembly = spec.assembly.map(inst => {
        return `${inst.method === 'sew' ? 'Sew' : 'Attach'} the ${inst.part} to the ${inst.position} of the ${inst.attachTo}.`;
    });

    // Standard abbreviations for amigurumi
    const abbreviations = [
        { abbr: 'MR', meaning: 'Magic Ring' },
        { abbr: 'sc', meaning: 'single crochet' },
        { abbr: 'inc', meaning: 'increase (2 sc in one stitch)' },
        { abbr: 'dec', meaning: 'invisible decrease' },
        { abbr: 'sl st', meaning: 'slip stitch' },
        { abbr: 'FO', meaning: 'fasten off' },
        { abbr: 'st', meaning: 'stitch(es)' },
    ];

    // Format materials
    const materials = {
        yarn: spec.materials.colors.map(c => `${c.name} (${c.hex}) - ${c.amount}`),
        hook: spec.materials.hookSize,
        extras: spec.materials.extras,
    };

    // Finishing notes
    const finishingNotes = [
        'Weave in all ends securely.',
        'Stuff firmly but not overly tight to maintain shape.',
        'Use safety eyes before closing the head (if applicable).',
        'Block pieces gently if needed for better shape.',
    ];

    return {
        name: spec.name,
        description: spec.description,
        difficulty: spec.difficulty,
        estimatedTime: spec.estimatedTime,
        materials,
        abbreviations,
        parts: partInstructions,
        assembly,
        finishingNotes,
    };
}

/**
 * Generate instructions for a single part
 */
function generatePartInstructions(
    part: AmigurumiPart,
    mesh: PartMeshData
): PartInstructions {
    const rounds = generateRoundsFromPart(part, mesh);
    const totalStitches = rounds.reduce((sum, r) => sum + r.stitchCount, 0);

    let stuffingNote = '';
    switch (part.stuffing) {
        case 'full':
            stuffingNote = 'Stuff firmly before closing.';
            break;
        case 'light':
            stuffingNote = 'Stuff lightly for a softer feel.';
            break;
        case 'none':
            stuffingNote = 'Do not stuff this piece.';
            break;
    }

    return {
        partName: part.name,
        color: part.color,
        rounds,
        totalStitches,
        stuffingNote,
    };
}

/**
 * Generate round-by-round instructions based on part type and dimensions
 */
function generateRoundsFromPart(
    part: AmigurumiPart,
    mesh: PartMeshData
): RoundInstruction[] {
    switch (part.type) {
        case 'sphere':
            return generateSphereRounds(part);
        case 'cylinder':
            return generateCylinderRounds(part);
        case 'cone':
            return generateConeRounds(part);
        case 'oval':
            return generateOvalRounds(part);
        case 'limb':
            return generateLimbRounds(part);
        case 'flat-circle':
            return generateFlatCircleRounds(part);
        default:
            return generateSphereRounds(part);
    }
}

// ================================================================
// SHAPE-SPECIFIC ROUND GENERATORS
// ================================================================

/**
 * Generate sphere rounds - standard amigurumi ball
 */
function generateSphereRounds(part: AmigurumiPart): RoundInstruction[] {
    const diameter = part.dimensions.diameter || 20;
    const startStitches = 6;

    // Calculate total rounds based on diameter
    const totalRounds = Math.max(8, Math.round(diameter / 2.5));
    const halfRounds = Math.floor(totalRounds / 2);

    const rounds: RoundInstruction[] = [];
    let currentStitches = startStitches;

    // Round 1: Magic ring
    rounds.push({
        roundNumber: 1,
        stitchCount: startStitches,
        instruction: `MR, ${startStitches} sc into ring. (${startStitches} st)`,
        stitchBreakdown: [`${startStitches} sc in MR`],
    });

    // Increasing rounds
    for (let round = 2; round <= halfRounds; round++) {
        const prevStitches = currentStitches;
        currentStitches = startStitches * round;
        const increases = currentStitches - prevStitches;

        const pattern = generateIncreasePattern(round, startStitches);

        rounds.push({
            roundNumber: round,
            stitchCount: currentStitches,
            instruction: `${pattern} (${currentStitches} st)`,
            stitchBreakdown: [pattern],
        });
    }

    // Even rounds (equator)
    const evenRounds = 2;
    for (let i = 0; i < evenRounds; i++) {
        rounds.push({
            roundNumber: halfRounds + 1 + i,
            stitchCount: currentStitches,
            instruction: `sc in each st around. (${currentStitches} st)`,
            stitchBreakdown: [`${currentStitches} sc`],
        });
    }

    // Decreasing rounds
    for (let round = halfRounds; round >= 2; round--) {
        const newStitches = startStitches * round;
        const roundNum = totalRounds - round + 1 + evenRounds;

        if (newStitches < currentStitches) {
            const pattern = generateDecreasePattern(round, startStitches, currentStitches);
            currentStitches = newStitches;

            rounds.push({
                roundNumber: roundNum,
                stitchCount: currentStitches,
                instruction: `${pattern} (${currentStitches} st)`,
                stitchBreakdown: [pattern],
            });
        }
    }

    // Final round
    rounds.push({
        roundNumber: rounds.length + 1,
        stitchCount: startStitches,
        instruction: `dec around until hole closes. FO.`,
        stitchBreakdown: ['dec x3', 'FO'],
    });

    return rounds;
}

/**
 * Generate cylinder rounds
 */
function generateCylinderRounds(part: AmigurumiPart): RoundInstruction[] {
    const diameter = part.dimensions.diameter || 15;
    const height = part.dimensions.height || 30;
    const startStitches = 6;

    const rounds: RoundInstruction[] = [];

    // Bottom circle
    const baseRounds = Math.ceil(diameter / 4);
    let currentStitches = startStitches;

    // Magic ring
    rounds.push({
        roundNumber: 1,
        stitchCount: startStitches,
        instruction: `MR, ${startStitches} sc into ring. (${startStitches} st)`,
        stitchBreakdown: [`${startStitches} sc in MR`],
    });

    // Base increases
    for (let round = 2; round <= baseRounds; round++) {
        currentStitches = startStitches * round;
        const pattern = generateIncreasePattern(round, startStitches);

        rounds.push({
            roundNumber: round,
            stitchCount: currentStitches,
            instruction: `${pattern} (${currentStitches} st)`,
            stitchBreakdown: [pattern],
        });
    }

    // Body (straight sides)
    const bodyRounds = Math.ceil(height / 2);
    for (let i = 0; i < bodyRounds; i++) {
        rounds.push({
            roundNumber: baseRounds + 1 + i,
            stitchCount: currentStitches,
            instruction: `sc in each st around. (${currentStitches} st)`,
            stitchBreakdown: [`${currentStitches} sc`],
        });
    }

    // Top (leave open or close based on use)
    rounds.push({
        roundNumber: rounds.length + 1,
        stitchCount: currentStitches,
        instruction: `sl st to first st. FO, leaving long tail for sewing.`,
        stitchBreakdown: ['sl st', 'FO'],
    });

    return rounds;
}

/**
 * Generate cone rounds
 */
function generateConeRounds(part: AmigurumiPart): RoundInstruction[] {
    const baseDiameter = part.dimensions.startDiameter || part.dimensions.diameter || 20;
    const height = part.dimensions.height || 25;
    const startStitches = 6;

    const rounds: RoundInstruction[] = [];
    const totalRounds = Math.ceil(height / 2);
    const maxStitches = Math.round((baseDiameter / 2) * 3);

    // Start from tip
    rounds.push({
        roundNumber: 1,
        stitchCount: 4,
        instruction: `MR, 4 sc into ring. (4 st)`,
        stitchBreakdown: ['4 sc in MR'],
    });

    let currentStitches = 4;

    // Gradual increases
    for (let round = 2; round <= totalRounds; round++) {
        const targetStitches = Math.min(maxStitches, 4 + Math.round((maxStitches - 4) * (round / totalRounds)));
        const increases = targetStitches - currentStitches;

        if (increases > 0) {
            const everyN = Math.max(1, Math.floor(currentStitches / increases));
            rounds.push({
                roundNumber: round,
                stitchCount: targetStitches,
                instruction: `*sc ${everyN - 1}, inc* repeat around. (${targetStitches} st)`,
                stitchBreakdown: [`inc every ${everyN} st`],
            });
        } else {
            rounds.push({
                roundNumber: round,
                stitchCount: currentStitches,
                instruction: `sc in each st around. (${currentStitches} st)`,
                stitchBreakdown: [`${currentStitches} sc`],
            });
        }
        currentStitches = targetStitches;
    }

    // Final round
    rounds.push({
        roundNumber: rounds.length + 1,
        stitchCount: currentStitches,
        instruction: `sl st to first st. FO, leaving long tail.`,
        stitchBreakdown: ['sl st', 'FO'],
    });

    return rounds;
}

/**
 * Generate oval rounds
 */
function generateOvalRounds(part: AmigurumiPart): RoundInstruction[] {
    const length = part.dimensions.length || 30;
    const width = part.dimensions.width || 20;
    const chainStart = Math.max(4, Math.round((length - width) / 2));

    const rounds: RoundInstruction[] = [];

    // Foundation chain
    rounds.push({
        roundNumber: 1,
        stitchCount: (chainStart + 1) * 2 + 4,
        instruction: `Ch ${chainStart + 1}. Starting in 2nd ch from hook: sc ${chainStart}, 3 sc in last ch, continuing on other side: sc ${chainStart}, 2 sc in first ch. (${(chainStart) * 2 + 5} st)`,
        stitchBreakdown: [`ch ${chainStart + 1}`, `sc around`],
    });

    // Increase rounds
    const totalRounds = Math.ceil(width / 4);
    let currentStitches = (chainStart) * 2 + 5;

    for (let round = 2; round <= totalRounds; round++) {
        const newStitches = currentStitches + 6;
        rounds.push({
            roundNumber: round,
            stitchCount: newStitches,
            instruction: `sc ${chainStart}, (inc, sc) x3, sc ${chainStart}, (sc, inc) x3. (${newStitches} st)`,
            stitchBreakdown: ['inc at curved ends'],
        });
        currentStitches = newStitches;
    }

    // Even rounds
    for (let i = 0; i < 2; i++) {
        rounds.push({
            roundNumber: totalRounds + 1 + i,
            stitchCount: currentStitches,
            instruction: `sc in each st around. (${currentStitches} st)`,
            stitchBreakdown: [`${currentStitches} sc`],
        });
    }

    // Decrease to close
    for (let round = totalRounds; round >= 2; round--) {
        currentStitches = currentStitches - 6;
        rounds.push({
            roundNumber: rounds.length + 1,
            stitchCount: Math.max(6, currentStitches),
            instruction: `dec evenly around. (${Math.max(6, currentStitches)} st)`,
            stitchBreakdown: ['dec x3 at each end'],
        });
    }

    rounds.push({
        roundNumber: rounds.length + 1,
        stitchCount: 0,
        instruction: 'FO, close remaining hole.',
        stitchBreakdown: ['FO'],
    });

    return rounds;
}

/**
 * Generate limb rounds (arms/legs)
 */
function generateLimbRounds(part: AmigurumiPart): RoundInstruction[] {
    const diameter = part.dimensions.diameter || 10;
    const length = part.dimensions.length || part.dimensions.height || 25;
    const startStitches = 6;

    const rounds: RoundInstruction[] = [];

    // Rounded tip
    rounds.push({
        roundNumber: 1,
        stitchCount: startStitches,
        instruction: `MR, ${startStitches} sc into ring. (${startStitches} st)`,
        stitchBreakdown: [`${startStitches} sc in MR`],
    });

    // One increase round
    rounds.push({
        roundNumber: 2,
        stitchCount: startStitches * 2,
        instruction: `inc in each st around. (${startStitches * 2} st)`,
        stitchBreakdown: [`${startStitches} inc`],
    });

    const bodyStitches = startStitches * 2;

    // Main body
    const bodyRounds = Math.max(3, Math.ceil(length / 3));
    for (let i = 0; i < bodyRounds; i++) {
        rounds.push({
            roundNumber: 3 + i,
            stitchCount: bodyStitches,
            instruction: `sc in each st around. (${bodyStitches} st)`,
            stitchBreakdown: [`${bodyStitches} sc`],
        });
    }

    // End
    rounds.push({
        roundNumber: rounds.length + 1,
        stitchCount: bodyStitches,
        instruction: `sl st to first st. FO, leaving long tail for sewing.`,
        stitchBreakdown: ['sl st', 'FO'],
    });

    return rounds;
}

/**
 * Generate flat circle rounds (for ears, patches)
 */
function generateFlatCircleRounds(part: AmigurumiPart): RoundInstruction[] {
    const diameter = part.dimensions.diameter || 10;
    const startStitches = 6;
    const totalRounds = Math.max(2, Math.ceil(diameter / 4));

    const rounds: RoundInstruction[] = [];

    rounds.push({
        roundNumber: 1,
        stitchCount: startStitches,
        instruction: `MR, ${startStitches} sc into ring. (${startStitches} st)`,
        stitchBreakdown: [`${startStitches} sc in MR`],
    });

    for (let round = 2; round <= totalRounds; round++) {
        const stitches = startStitches * round;
        const pattern = generateIncreasePattern(round, startStitches);

        rounds.push({
            roundNumber: round,
            stitchCount: stitches,
            instruction: `${pattern} (${stitches} st)`,
            stitchBreakdown: [pattern],
        });
    }

    rounds.push({
        roundNumber: totalRounds + 1,
        stitchCount: startStitches * totalRounds,
        instruction: `sl st to first st. FO, leaving tail for sewing.`,
        stitchBreakdown: ['sl st', 'FO'],
    });

    return rounds;
}

// ================================================================
// HELPER FUNCTIONS
// ================================================================

/**
 * Generate increase pattern string for a given round
 */
function generateIncreasePattern(round: number, baseStitches: number): string {
    if (round === 2) {
        return 'inc in each st around';
    }

    const scBetween = round - 2;
    if (scBetween === 0) {
        return `*sc, inc* repeat around`;
    }
    return `*sc ${scBetween}, inc* repeat ${baseStitches} times`;
}

/**
 * Generate decrease pattern string
 */
function generateDecreasePattern(round: number, baseStitches: number, currentStitches: number): string {
    const scBetween = round - 2;
    if (scBetween === 0) {
        return `*sc, dec* repeat around`;
    }
    return `*sc ${scBetween}, dec* repeat ${baseStitches} times`;
}

/**
 * Format pattern as readable text
 */
export function formatAmigurumiPatternAsText(pattern: AmigurumiPattern): string {
    let text = '';

    // Header
    text += `# ${pattern.name}\n\n`;
    text += `${pattern.description}\n\n`;
    text += `**Difficulty:** ${pattern.difficulty}\n`;
    text += `**Estimated Time:** ${pattern.estimatedTime}\n\n`;

    // Materials
    text += `## Materials\n\n`;
    text += `- Hook: ${pattern.materials.hook}\n`;
    pattern.materials.yarn.forEach(y => {
        text += `- ${y}\n`;
    });
    pattern.materials.extras.forEach(e => {
        text += `- ${e}\n`;
    });
    text += '\n';

    // Abbreviations
    text += `## Abbreviations\n\n`;
    pattern.abbreviations.forEach(a => {
        text += `- **${a.abbr}**: ${a.meaning}\n`;
    });
    text += '\n';

    // Parts
    pattern.parts.forEach(part => {
        text += `## ${part.partName}\n\n`;
        text += `*Color: ${part.color}*\n\n`;

        part.rounds.forEach(r => {
            text += `**Rnd ${r.roundNumber}:** ${r.instruction}\n`;
        });

        text += `\n${part.stuffingNote}\n\n`;
    });

    // Assembly
    text += `## Assembly\n\n`;
    pattern.assembly.forEach((a, i) => {
        text += `${i + 1}. ${a}\n`;
    });
    text += '\n';

    // Finishing
    text += `## Finishing Notes\n\n`;
    pattern.finishingNotes.forEach(n => {
        text += `- ${n}\n`;
    });

    return text;
}

/**
 * Format pattern as FormattedPattern object for UI display
 */
export function formatPatternForUI(pattern: AmigurumiPattern): {
    title: string;
    materials: string[];
    abbreviations: { abbr: string; meaning: string }[];
    instructions: string[];
    notes: string[];
} {
    const instructions: string[] = [];

    pattern.parts.forEach(part => {
        instructions.push(`\n**${part.partName}** (${part.color})`);
        part.rounds.forEach(r => {
            instructions.push(`**Rnd ${r.roundNumber}:** ${r.instruction}`);
        });
        instructions.push(part.stuffingNote);
    });

    instructions.push('\n**Assembly:**');
    pattern.assembly.forEach((a, i) => {
        instructions.push(`${i + 1}. ${a}`);
    });

    return {
        title: pattern.name,
        materials: [
            `Hook: ${pattern.materials.hook}`,
            ...pattern.materials.yarn,
            ...pattern.materials.extras,
        ],
        abbreviations: pattern.abbreviations,
        instructions,
        notes: pattern.finishingNotes,
    };
}
