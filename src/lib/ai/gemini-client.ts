/**
 * Gemini AI Client
 * Handles communication with Google's Gemini API for pattern ideation
 */

import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import { SYSTEM_PROMPT, buildUserPrompt } from './prompt-templates';

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
