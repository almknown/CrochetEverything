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
            throw new Error('AI response did not contain valid JSON');
        }

        try {
            const parsed = JSON.parse(retryMatch[0]);
            return validateAndNormalizeAmigurumiSpec(parsed);
        } catch (e) {
            throw new Error(`Failed to parse AI response as JSON: ${e}`);
        }
    }

    const jsonStr = jsonMatch[1] || jsonMatch[0];

    try {
        const parsed = JSON.parse(jsonStr);
        return validateAndNormalizeAmigurumiSpec(parsed);
    } catch (e) {
        throw new Error(`Failed to parse AI response as JSON: ${e}`);
    }
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

// Re-export types for convenience
export type { AIAmigurumiSpec, AmigurumiPart, AssemblyInstruction };
