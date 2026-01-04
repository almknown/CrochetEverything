/**
 * Gemini AI Client
 * Handles communication with Google's Gemini API for pattern ideation
 */

import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import { SYSTEM_PROMPT, buildUserPrompt } from './prompt-templates';
import {
    AMIGURUMI_SYSTEM_PROMPT,
    buildAmigurumiUserPrompt,
    AMIGURUMI_RECOVERY_PROMPT,
    AIAmigurumiSpec,
    AmigurumiPart,
    AssemblyInstruction
} from './amigurumi-prompts';

// Initialize client (API key from environment)
let genAI: GoogleGenerativeAI | null = null;
let model: GenerativeModel | null = null;

function getModel(): GenerativeModel {
    if (!model) {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            throw new Error('GEMINI_API_KEY environment variable is not set');
        }
        genAI = new GoogleGenerativeAI(apiKey);
        model = genAI.getGenerativeModel({
            model: 'gemini-flash-latest',
            generationConfig: {
                temperature: 0.7,
                topP: 0.8,
                topK: 40,
                maxOutputTokens: 1024,
            },
        });
    }
    return model;
}

/**
 * Pattern specification returned by AI
 */
export interface AIPatternSpec {
    title: string;
    shape: 'rectangle' | 'circle' | 'triangle' | 'hexagon' | 'oval';
    dimensions: {
        width: number;
        height: number;
    };
    colors: string[];
    description: string;
    suggestedUses: string[];
}

/**
 * Generate a pattern specification from user prompt
 */
export async function generatePatternSpec(userPrompt: string): Promise<AIPatternSpec> {
    const model = getModel();

    const chat = model.startChat({
        history: [
            {
                role: 'user',
                parts: [{ text: SYSTEM_PROMPT }],
            },
            {
                role: 'model',
                parts: [{ text: 'I understand. I will generate structured JSON pattern specifications only, without any stitch counts or math calculations. I\'ll focus on creative design elements: shape, colors, title, description, and suggested uses. Ready for prompts.' }],
            },
        ],
    });

    const result = await chat.sendMessage(buildUserPrompt(userPrompt));
    const response = result.response.text();

    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)\s*```/) ||
        response.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
        throw new Error('AI response did not contain valid JSON');
    }

    const jsonStr = jsonMatch[1] || jsonMatch[0];

    try {
        const parsed = JSON.parse(jsonStr);
        return validateAndNormalizeSpec(parsed);
    } catch (e) {
        throw new Error(`Failed to parse AI response as JSON: ${e}`);
    }
}

/**
 * Validate and normalize the AI response
 */
function validateAndNormalizeSpec(raw: Record<string, unknown>): AIPatternSpec {
    // Validate required fields
    if (!raw.title || typeof raw.title !== 'string') {
        throw new Error('AI response missing title');
    }
    if (!raw.shape || typeof raw.shape !== 'string') {
        throw new Error('AI response missing shape');
    }

    // Normalize shape
    const validShapes = ['rectangle', 'circle', 'triangle', 'hexagon', 'oval'];
    const shape = raw.shape.toLowerCase();
    if (!validShapes.includes(shape)) {
        throw new Error(`Invalid shape: ${shape}. Must be one of: ${validShapes.join(', ')}`);
    }

    // Normalize dimensions
    const dimensions = raw.dimensions as Record<string, unknown> || {};
    const width = Number(dimensions.width) || 10;
    const height = Number(dimensions.height) || 10;

    // Normalize colors
    let colors: string[] = ['#F5DEB3']; // Default wheat color
    if (Array.isArray(raw.colors)) {
        colors = raw.colors.filter(c => typeof c === 'string' && /^#[0-9A-Fa-f]{6}$/.test(c));
        if (colors.length === 0) colors = ['#F5DEB3'];
    }

    // Normalize suggested uses
    let suggestedUses: string[] = [];
    if (Array.isArray(raw.suggestedUses)) {
        suggestedUses = raw.suggestedUses.filter(u => typeof u === 'string');
    }

    return {
        title: raw.title as string,
        shape: shape as AIPatternSpec['shape'],
        dimensions: { width, height },
        colors,
        description: typeof raw.description === 'string' ? raw.description : '',
        suggestedUses,
    };
}

/**
 * Generate an amigurumi specification from user prompt
 * Returns a complete 3D composition with parts, assembly, and materials
 */
export async function generateAmigurumiSpec(userPrompt: string): Promise<AIAmigurumiSpec> {
    const model = getModel();

    const chat = model.startChat({
        history: [
            {
                role: 'user',
                parts: [{ text: AMIGURUMI_SYSTEM_PROMPT }],
            },
            {
                role: 'model',
                parts: [{ text: 'I understand. I will generate complete amigurumi specifications as JSON, breaking down the design into 3D primitive shapes (spheres, cylinders, cones, limbs) with proper proportions, assembly instructions, and materials. Ready to design amigurumi!' }],
            },
        ],
    });

    try {
        const result = await chat.sendMessage(buildAmigurumiUserPrompt(userPrompt));
        const response = result.response.text();

        // Extract JSON from response (handle markdown code blocks)
        const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)\s*```/) ||
            response.match(/\{[\s\S]*\}/);

        if (!jsonMatch) {
            // Try recovery prompt
            const retryResult = await chat.sendMessage(AMIGURUMI_RECOVERY_PROMPT);
            const retryResponse = retryResult.response.text();
            const retryMatch = retryResponse.match(/\{[\s\S]*\}/);

            if (!retryMatch) {
                console.log('[generateAmigurumiSpec] No JSON found in AI response, using fallback');
                return generateFallbackSpec(userPrompt);
            }

            try {
                const parsed = safeParseJSON(retryMatch[0]);
                return validateAndNormalizeAmigurumiSpec(parsed);
            } catch (e) {
                console.log('[generateAmigurumiSpec] Retry parse failed, using fallback:', e);
                return generateFallbackSpec(userPrompt);
            }
        }

        const jsonStr = jsonMatch[1] || jsonMatch[0];

        try {
            const parsed = safeParseJSON(jsonStr);
            return validateAndNormalizeAmigurumiSpec(parsed);
        } catch (e) {
            // Try recovery prompt as last resort
            try {
                const retryResult = await chat.sendMessage(AMIGURUMI_RECOVERY_PROMPT);
                const retryResponse = retryResult.response.text();
                const retryMatch = retryResponse.match(/\{[\s\S]*\}/);
                if (retryMatch) {
                    const parsed = safeParseJSON(retryMatch[0]);
                    return validateAndNormalizeAmigurumiSpec(parsed);
                }
            } catch {
                // Fall through to fallback
            }
            console.log('[generateAmigurumiSpec] All parsing attempts failed, using fallback:', e);
            return generateFallbackSpec(userPrompt);
        }
    } catch (e) {
        console.log('[generateAmigurumiSpec] API call failed, using fallback:', e);
        return generateFallbackSpec(userPrompt);
    }
}

/**
 * Generate a fallback amigurumi spec based on user prompt keywords
 * This is used when AI JSON parsing fails
 */
function generateFallbackSpec(userPrompt: string): AIAmigurumiSpec {
    const prompt = userPrompt.toLowerCase();

    // Detect what kind of amigurumi based on keywords
    const isOctopus = prompt.includes('octopus') || prompt.includes('squid');
    const isBear = prompt.includes('bear') || prompt.includes('teddy');
    const isCat = prompt.includes('cat') || prompt.includes('kitty');
    const isBunny = prompt.includes('bunny') || prompt.includes('rabbit');
    const isBee = prompt.includes('bee');
    const isPenguin = prompt.includes('penguin');

    // Detect colors
    const colors: { name: string; hex: string; amount: string }[] = [];
    if (prompt.includes('pink')) colors.push({ name: 'Pink', hex: '#FFB6C1', amount: '50g' });
    if (prompt.includes('brown')) colors.push({ name: 'Brown', hex: '#8B4513', amount: '50g' });
    if (prompt.includes('white')) colors.push({ name: 'White', hex: '#FFFFFF', amount: '30g' });
    if (prompt.includes('black')) colors.push({ name: 'Black', hex: '#000000', amount: '20g' });
    if (prompt.includes('yellow')) colors.push({ name: 'Yellow', hex: '#FFD700', amount: '50g' });
    if (prompt.includes('orange')) colors.push({ name: 'Orange', hex: '#FFA500', amount: '50g' });
    if (prompt.includes('blue')) colors.push({ name: 'Blue', hex: '#4169E1', amount: '50g' });
    if (prompt.includes('purple')) colors.push({ name: 'Purple', hex: '#9370DB', amount: '50g' });

    // Default color if none detected
    if (colors.length === 0) {
        colors.push({ name: 'Main Color', hex: '#F5DEB3', amount: '50g' });
    }

    const mainColor = colors[0].hex;
    const accentColor = colors.length > 1 ? colors[1].hex : '#FFFFFF';

    // Generate appropriate parts based on type
    let parts: AmigurumiPart[];
    let assembly: AssemblyInstruction[];
    let name: string;
    let description: string;

    if (isOctopus) {
        name = 'Cute Octopus';
        description = 'A friendly octopus with curly tentacles';
        parts = [
            { name: 'body', type: 'sphere', dimensions: { diameter: 40 }, color: mainColor, stuffing: 'full' },
            ...Array(8).fill(null).map((_, i) => ({
                name: `tentacle_${i + 1}`,
                type: 'limb' as const,
                dimensions: { diameter: 8, length: 30 },
                color: mainColor,
                stuffing: 'light' as const,
            })),
        ];
        assembly = Array(8).fill(null).map((_, i) => ({
            part: `tentacle_${i + 1}`,
            attachTo: 'body',
            position: 'bottom' as const,
            method: 'sew' as const,
        }));
    } else if (isBear) {
        name = 'Chubby Teddy Bear';
        description = 'A huggable teddy bear with a cute muzzle';
        parts = [
            { name: 'body', type: 'oval', dimensions: { diameter: 40, length: 50 }, color: mainColor, stuffing: 'full' },
            { name: 'head', type: 'sphere', dimensions: { diameter: 35 }, color: mainColor, stuffing: 'full' },
            { name: 'muzzle', type: 'oval', dimensions: { diameter: 15, length: 10 }, color: accentColor, stuffing: 'light' },
            { name: 'ear_left', type: 'flat-circle', dimensions: { diameter: 12 }, color: mainColor, stuffing: 'none' },
            { name: 'ear_right', type: 'flat-circle', dimensions: { diameter: 12 }, color: mainColor, stuffing: 'none' },
            { name: 'arm_left', type: 'limb', dimensions: { diameter: 12, length: 25 }, color: mainColor, stuffing: 'full' },
            { name: 'arm_right', type: 'limb', dimensions: { diameter: 12, length: 25 }, color: mainColor, stuffing: 'full' },
            { name: 'leg_left', type: 'limb', dimensions: { diameter: 14, length: 20 }, color: mainColor, stuffing: 'full' },
            { name: 'leg_right', type: 'limb', dimensions: { diameter: 14, length: 20 }, color: mainColor, stuffing: 'full' },
        ];
        assembly = [
            { part: 'head', attachTo: 'body', position: 'top', method: 'sew' },
            { part: 'muzzle', attachTo: 'head', position: 'front', method: 'sew' },
            { part: 'ear_left', attachTo: 'head', position: 'top', method: 'sew' },
            { part: 'ear_right', attachTo: 'head', position: 'top', method: 'sew' },
            { part: 'arm_left', attachTo: 'body', position: 'left', method: 'sew' },
            { part: 'arm_right', attachTo: 'body', position: 'right', method: 'sew' },
            { part: 'leg_left', attachTo: 'body', position: 'bottom', method: 'sew' },
            { part: 'leg_right', attachTo: 'body', position: 'bottom', method: 'sew' },
        ];
    } else if (isBee) {
        name = 'Buzzy Bee';
        description = 'A cheerful bee with stripes and tiny wings';
        parts = [
            { name: 'body', type: 'oval', dimensions: { diameter: 30, length: 40 }, color: '#FFD700', stuffing: 'full' },
            { name: 'head', type: 'sphere', dimensions: { diameter: 25 }, color: '#FFD700', stuffing: 'full' },
            { name: 'wing_left', type: 'flat-circle', dimensions: { diameter: 15 }, color: '#FFFFFF', stuffing: 'none' },
            { name: 'wing_right', type: 'flat-circle', dimensions: { diameter: 15 }, color: '#FFFFFF', stuffing: 'none' },
            { name: 'stripe_1', type: 'flat-circle', dimensions: { diameter: 30 }, color: '#000000', stuffing: 'none' },
            { name: 'stripe_2', type: 'flat-circle', dimensions: { diameter: 28 }, color: '#000000', stuffing: 'none' },
            { name: 'antenna_left', type: 'cylinder', dimensions: { diameter: 3, height: 10 }, color: '#000000', stuffing: 'none' },
            { name: 'antenna_right', type: 'cylinder', dimensions: { diameter: 3, height: 10 }, color: '#000000', stuffing: 'none' },
        ];
        assembly = [
            { part: 'head', attachTo: 'body', position: 'front', method: 'sew' },
            { part: 'wing_left', attachTo: 'body', position: 'left', method: 'sew' },
            { part: 'wing_right', attachTo: 'body', position: 'right', method: 'sew' },
            { part: 'stripe_1', attachTo: 'body', position: 'front', method: 'sew' },
            { part: 'stripe_2', attachTo: 'body', position: 'back', method: 'sew' },
            { part: 'antenna_left', attachTo: 'head', position: 'top', method: 'sew' },
            { part: 'antenna_right', attachTo: 'head', position: 'top', method: 'sew' },
        ];
    } else {
        // Default: simple sphere creature
        name = 'Amigurumi Creature';
        description = 'A cute round amigurumi friend';
        parts = [
            { name: 'body', type: 'sphere', dimensions: { diameter: 40 }, color: mainColor, stuffing: 'full' },
            { name: 'head', type: 'sphere', dimensions: { diameter: 30 }, color: mainColor, stuffing: 'full' },
            { name: 'arm_left', type: 'limb', dimensions: { diameter: 10, length: 20 }, color: mainColor, stuffing: 'light' },
            { name: 'arm_right', type: 'limb', dimensions: { diameter: 10, length: 20 }, color: mainColor, stuffing: 'light' },
            { name: 'leg_left', type: 'limb', dimensions: { diameter: 12, length: 15 }, color: mainColor, stuffing: 'full' },
            { name: 'leg_right', type: 'limb', dimensions: { diameter: 12, length: 15 }, color: mainColor, stuffing: 'full' },
        ];
        assembly = [
            { part: 'head', attachTo: 'body', position: 'top', method: 'sew' },
            { part: 'arm_left', attachTo: 'body', position: 'left', method: 'sew' },
            { part: 'arm_right', attachTo: 'body', position: 'right', method: 'sew' },
            { part: 'leg_left', attachTo: 'body', position: 'bottom', method: 'sew' },
            { part: 'leg_right', attachTo: 'body', position: 'bottom', method: 'sew' },
        ];
    }

    return {
        name,
        description,
        difficulty: 'beginner',
        estimatedTime: '2-3 hours',
        parts,
        assembly,
        materials: {
            yarnWeight: 'worsted',
            hookSize: '4.0mm',
            colors,
            extras: ['9mm safety eyes', 'polyester stuffing', 'yarn needle'],
        },
    };
}

/**
 * Validate and normalize amigurumi specification
 */
function validateAndNormalizeAmigurumiSpec(raw: Record<string, unknown>): AIAmigurumiSpec {
    // Validate required fields
    if (!raw.name || typeof raw.name !== 'string') {
        raw.name = 'Amigurumi Creation';
    }

    // Normalize parts
    const parts: AmigurumiPart[] = [];
    if (Array.isArray(raw.parts)) {
        for (const part of raw.parts) {
            if (part && typeof part === 'object') {
                const p = part as Record<string, unknown>;
                const validTypes = ['sphere', 'cylinder', 'cone', 'oval', 'flat-circle', 'limb', 'custom'];
                const type = validTypes.includes(p.type as string) ? p.type as string : 'sphere';

                parts.push({
                    name: typeof p.name === 'string' ? p.name : 'Part',
                    type: type as AmigurumiPart['type'],
                    dimensions: normalizePartDimensions(p.dimensions),
                    color: typeof p.color === 'string' && /^#[0-9A-Fa-f]{6}$/.test(p.color)
                        ? p.color
                        : '#F5DEB3',
                    stuffing: ['full', 'light', 'none'].includes(p.stuffing as string)
                        ? p.stuffing as 'full' | 'light' | 'none'
                        : 'full',
                    details: normalizePartDetails(p.details),
                });
            }
        }
    }

    // Ensure at least one part exists
    if (parts.length === 0) {
        parts.push({
            name: 'body',
            type: 'sphere',
            dimensions: { diameter: 30 },
            color: '#F5DEB3',
            stuffing: 'full',
        });
    }

    // Normalize assembly
    const assembly: AssemblyInstruction[] = [];
    if (Array.isArray(raw.assembly)) {
        for (const inst of raw.assembly) {
            if (inst && typeof inst === 'object') {
                const i = inst as Record<string, unknown>;
                const validPositions = ['top', 'bottom', 'front', 'back', 'left', 'right', 'custom'];
                const validMethods = ['sew', 'crochet-together', 'pin-and-sew'];

                assembly.push({
                    part: typeof i.part === 'string' ? i.part : '',
                    attachTo: typeof i.attachTo === 'string' ? i.attachTo : '',
                    position: validPositions.includes(i.position as string)
                        ? i.position as AssemblyInstruction['position']
                        : 'top',
                    method: validMethods.includes(i.method as string)
                        ? i.method as AssemblyInstruction['method']
                        : 'sew',
                });
            }
        }
    }

    // Normalize materials
    const rawMaterials = raw.materials as Record<string, unknown> || {};
    const colors: { name: string; hex: string; amount: string }[] = [];

    if (Array.isArray(rawMaterials.colors)) {
        for (const c of rawMaterials.colors) {
            if (c && typeof c === 'object') {
                const col = c as Record<string, unknown>;
                colors.push({
                    name: typeof col.name === 'string' ? col.name : 'Main Color',
                    hex: typeof col.hex === 'string' && /^#[0-9A-Fa-f]{6}$/.test(col.hex)
                        ? col.hex
                        : '#F5DEB3',
                    amount: typeof col.amount === 'string' ? col.amount : '50g',
                });
            }
        }
    }

    // Default color if none provided
    if (colors.length === 0) {
        colors.push({ name: 'Main', hex: '#F5DEB3', amount: '50g' });
    }

    return {
        name: raw.name as string,
        description: typeof raw.description === 'string' ? raw.description : '',
        difficulty: ['beginner', 'intermediate', 'advanced'].includes(raw.difficulty as string)
            ? raw.difficulty as AIAmigurumiSpec['difficulty']
            : 'beginner',
        estimatedTime: typeof raw.estimatedTime === 'string' ? raw.estimatedTime : '2-3 hours',
        parts,
        assembly,
        materials: {
            yarnWeight: typeof rawMaterials.yarnWeight === 'string' ? rawMaterials.yarnWeight : 'worsted',
            hookSize: typeof rawMaterials.hookSize === 'string' ? rawMaterials.hookSize : '4.0mm',
            colors,
            extras: Array.isArray(rawMaterials.extras)
                ? rawMaterials.extras.filter((e): e is string => typeof e === 'string')
                : ['9mm safety eyes', 'polyester stuffing', 'yarn needle'],
        },
    };
}

/**
 * Normalize part dimensions
 */
function normalizePartDimensions(dims: unknown): AmigurumiPart['dimensions'] {
    if (!dims || typeof dims !== 'object') {
        return { diameter: 20 };
    }

    const d = dims as Record<string, unknown>;
    const result: AmigurumiPart['dimensions'] = {};

    if (typeof d.diameter === 'number' && d.diameter > 0) result.diameter = d.diameter;
    if (typeof d.height === 'number' && d.height > 0) result.height = d.height;
    if (typeof d.length === 'number' && d.length > 0) result.length = d.length;
    if (typeof d.width === 'number' && d.width > 0) result.width = d.width;
    if (typeof d.startDiameter === 'number' && d.startDiameter > 0) result.startDiameter = d.startDiameter;
    if (typeof d.endDiameter === 'number' && d.endDiameter > 0) result.endDiameter = d.endDiameter;

    // Ensure at least one dimension
    if (Object.keys(result).length === 0) {
        result.diameter = 20;
    }

    return result;
}

/**
 * Normalize part details (eyes, nose, etc.)
 */
function normalizePartDetails(details: unknown): AmigurumiPart['details'] {
    if (!Array.isArray(details)) return undefined;

    const result = [];
    const validTypes = ['safety-eye', 'safety-nose', 'embroidery', 'button', 'bead'];

    for (const d of details) {
        if (d && typeof d === 'object') {
            const det = d as Record<string, unknown>;
            if (validTypes.includes(det.type as string)) {
                result.push({
                    type: det.type as 'safety-eye' | 'safety-nose' | 'embroidery' | 'button' | 'bead',
                    position: normalizePosition(det.position),
                    size: typeof det.size === 'number' ? det.size : undefined,
                    color: typeof det.color === 'string' ? det.color : undefined,
                    description: typeof det.description === 'string' ? det.description : undefined,
                });
            }
        }
    }

    return result.length > 0 ? result : undefined;
}

/**
 * Normalize position object
 */
function normalizePosition(pos: unknown): { x: number; y: number; z: number } {
    if (!pos || typeof pos !== 'object') {
        return { x: 0, y: 0, z: 0 };
    }

    const p = pos as Record<string, unknown>;
    return {
        x: typeof p.x === 'number' ? p.x : 0,
        y: typeof p.y === 'number' ? p.y : 0,
        z: typeof p.z === 'number' ? p.z : 0,
    };
}

/**
 * Attempt to repair common JSON formatting issues from AI output
 */
function repairJSON(jsonStr: string): string {
    let repaired = jsonStr.trim();

    // Remove any markdown code block markers
    repaired = repaired.replace(/^```(?:json)?\s*/i, '');
    repaired = repaired.replace(/\s*```$/i, '');

    // Remove trailing commas before } or ] (global, handles nested cases)
    let prev = '';
    while (prev !== repaired) {
        prev = repaired;
        repaired = repaired.replace(/,(\s*[}\]])/g, '$1');
    }

    // Fix common number issues (remove leading zeros, except for decimals)
    repaired = repaired.replace(/:(\s*)0+(\d+)/g, ':$1$2');

    // Remove any control characters that might have snuck in (except newlines/tabs in strings)
    repaired = repaired.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ' ');

    // Fix unquoted property names (common AI error)
    repaired = repaired.replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)(\s*:)/g, '$1"$2"$3');

    // Fix single quotes used instead of double quotes
    repaired = repaired.replace(/'/g, '"');

    // Balance brackets
    repaired = balanceBrackets(repaired);

    return repaired;
}

/**
 * Balance unmatched brackets in JSON string
 */
function balanceBrackets(jsonStr: string): string {
    let result = jsonStr;
    let openBraces = 0;
    let openBrackets = 0;
    let inString = false;
    let escapeNext = false;

    for (let i = 0; i < result.length; i++) {
        const char = result[i];

        if (escapeNext) {
            escapeNext = false;
            continue;
        }

        if (char === '\\') {
            escapeNext = true;
            continue;
        }

        if (char === '"') {
            inString = !inString;
            continue;
        }

        if (!inString) {
            if (char === '{') openBraces++;
            else if (char === '}') openBraces--;
            else if (char === '[') openBrackets++;
            else if (char === ']') openBrackets--;
        }
    }

    // Close any unclosed strings
    if (inString) {
        result += '"';
    }

    // Close any unclosed arrays (add closing brackets)
    while (openBrackets > 0) {
        // Find a good place to close - before the last }
        const lastBrace = result.lastIndexOf('}');
        if (lastBrace > 0) {
            result = result.substring(0, lastBrace) + ']' + result.substring(lastBrace);
        } else {
            result += ']';
        }
        openBrackets--;
    }

    // Close any unclosed objects
    while (openBraces > 0) {
        result += '}';
        openBraces--;
    }

    return result;
}

/**
 * Safely parse JSON with automatic repair attempts
 */
function safeParseJSON(jsonStr: string): Record<string, unknown> {
    // Log original for debugging (only first 500 chars)
    console.log('[safeParseJSON] Attempting to parse JSON of length:', jsonStr.length);

    // First try direct parse
    try {
        return JSON.parse(jsonStr);
    } catch (firstError) {
        console.log('[safeParseJSON] Direct parse failed, attempting repair...');

        // Try with repair
        try {
            const repaired = repairJSON(jsonStr);
            console.log('[safeParseJSON] Repaired JSON length:', repaired.length);
            return JSON.parse(repaired);
        } catch (secondError) {
            console.log('[safeParseJSON] Repaired parse failed, trying to extract valid JSON...');

            // Try to find and extract just the main object
            const objectMatch = jsonStr.match(/\{[\s\S]*\}/);
            if (objectMatch) {
                try {
                    const extracted = objectMatch[0];
                    const repaired = repairJSON(extracted);
                    console.log('[safeParseJSON] Extracted object length:', repaired.length);
                    return JSON.parse(repaired);
                } catch {
                    // Try more aggressive truncation - cut at last complete property
                    try {
                        const truncated = truncateToValidJSON(objectMatch[0]);
                        const repaired = repairJSON(truncated);
                        return JSON.parse(repaired);
                    } catch {
                        // Give up
                    }
                }
            }
            throw firstError;
        }
    }
}

/**
 * Truncate JSON to last valid property
 */
function truncateToValidJSON(jsonStr: string): string {
    // Find last complete key-value pair by looking for patterns like  ,"key": value
    const lastCompleteProperty = jsonStr.lastIndexOf('",');

    if (lastCompleteProperty > 0) {
        // Find where this property's value ends
        let depth = 0;
        let i = lastCompleteProperty + 2;
        let inString = false;
        let escapeNext = false;
        let valueStart = -1;

        // Skip whitespace and find property start
        while (i < jsonStr.length && /\s/.test(jsonStr[i])) i++;
        if (jsonStr[i] === '"') {
            // Skip property name
            i++;
            while (i < jsonStr.length && jsonStr[i] !== '"') {
                if (jsonStr[i] === '\\') i++;
                i++;
            }
            i++; // skip closing quote
            // Skip : and whitespace
            while (i < jsonStr.length && /[\s:]/.test(jsonStr[i])) i++;
            valueStart = i;
        }

        // Now find end of value
        if (valueStart > 0) {
            i = valueStart;
            while (i < jsonStr.length) {
                const char = jsonStr[i];

                if (escapeNext) {
                    escapeNext = false;
                    i++;
                    continue;
                }

                if (char === '\\') {
                    escapeNext = true;
                    i++;
                    continue;
                }

                if (char === '"') {
                    inString = !inString;
                }

                if (!inString) {
                    if (char === '{' || char === '[') depth++;
                    else if (char === '}' || char === ']') {
                        if (depth === 0) {
                            // This is the closing of our main object
                            return jsonStr.substring(0, i + 1);
                        }
                        depth--;
                    } else if (char === ',' && depth === 0) {
                        // End of this value, include up to here
                        // Keep going to find more...
                    }
                }
                i++;
            }
        }
    }

    // Fallback - just close any open structures
    return balanceBrackets(jsonStr);
}

// Re-export types for convenience
export type { AIAmigurumiSpec, AmigurumiPart, AssemblyInstruction };
