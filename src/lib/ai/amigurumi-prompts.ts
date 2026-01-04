/**
 * Amigurumi AI Prompt Templates
 * System prompts for generating 3D amigurumi specifications from user prompts
 * These prompts instruct Gemini to output structured mesh descriptions
 */

/**
 * Amigurumi body part specification
 */
export interface AmigurumiPart {
    name: string;
    type: 'sphere' | 'cylinder' | 'cone' | 'oval' | 'flat-circle' | 'limb' | 'custom';
    dimensions: {
        diameter?: number;      // For spheres, cylinders
        height?: number;        // For cylinders, cones
        length?: number;        // For limbs, ovals
        width?: number;         // For ovals
        startDiameter?: number; // For cones, tapered shapes
        endDiameter?: number;   // For cones, tapered shapes
    };
    color: string;              // Hex color
    stuffing: 'full' | 'light' | 'none';
    details?: PartDetail[];
}

/**
 * Part details (safety eyes, embroidery, etc.)
 */
export interface PartDetail {
    type: 'safety-eye' | 'safety-nose' | 'embroidery' | 'button' | 'bead';
    position: { x: number; y: number; z: number }; // Relative position on part
    size?: number;
    color?: string;
    description?: string;
}

/**
 * How parts connect together
 */
export interface AssemblyInstruction {
    part: string;               // Name of part to attach
    attachTo: string;           // Name of part to attach to
    position: 'top' | 'bottom' | 'front' | 'back' | 'left' | 'right' | 'custom';
    customPosition?: { x: number; y: number; z: number };
    method: 'sew' | 'crochet-together' | 'pin-and-sew';
}

/**
 * Complete amigurumi specification from AI
 */
export interface AIAmigurumiSpec {
    name: string;
    description: string;
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    estimatedTime: string;      // e.g., "2-3 hours"
    parts: AmigurumiPart[];
    assembly: AssemblyInstruction[];
    materials: {
        yarnWeight: string;     // e.g., "worsted", "DK", "fingering"
        hookSize: string;       // e.g., "3.5mm", "4.0mm"
        colors: { name: string; hex: string; amount: string }[];
        extras: string[];       // Safety eyes, stuffing, etc.
    };
}

/**
 * System prompt for amigurumi mesh generation
 * Instructs Gemini to output structured 3D composition
 */
export const AMIGURUMI_SYSTEM_PROMPT = `You are an expert amigurumi designer AI that creates 3D crochet toy specifications.

CRITICAL RULES:
1. Output ONLY valid JSON - no explanations, no markdown wrapper, just the JSON object
2. Break down the amigurumi into primitive 3D shapes (spheres, cylinders, cones, limbs)
3. Specify realistic proportions - consider how crochet fabric behaves
4. Include all necessary parts for a complete, cute amigurumi

AVAILABLE SHAPE TYPES:
- sphere: round ball (for heads, bodies, snouts)
- cylinder: tube shape (for legs, arms, necks)
- cone: tapered shape (for ears, horns, beaks)
- oval: elongated sphere (for bodies, muzzles)
- flat-circle: 2D circle (for ears, spots, patches)
- limb: cylinder with rounded ends (for arms, legs)

DIMENSION GUIDELINES (in stitch-units, where 6 stitches ≈ 1 inch):
- Small amigurumi: 15-30 units diameter for main body
- Medium amigurumi: 30-50 units diameter for main body
- Large amigurumi: 50-80 units diameter for main body
- Head typically 60-80% of body diameter
- Arms/legs typically 20-40% of body diameter

COLOR FORMAT: Use hex colors like "#FFB6C1" for pink

STUFFING:
- "full" for main body parts (firm, holds shape)
- "light" for thin parts like ears
- "none" for flat decorative pieces

OUTPUT FORMAT (strict JSON):
{
    "name": "Creative name for the amigurumi",
    "description": "Brief description of the finished toy",
    "difficulty": "beginner|intermediate|advanced",
    "estimatedTime": "X-Y hours",
    "parts": [
        {
            "name": "part_name",
            "type": "sphere|cylinder|cone|oval|flat-circle|limb",
            "dimensions": {
                "diameter": <number>,
                "height": <number if applicable>,
                "length": <number if applicable>
            },
            "color": "#HEXCOLOR",
            "stuffing": "full|light|none",
            "details": [
                {
                    "type": "safety-eye|safety-nose|embroidery",
                    "position": { "x": 0, "y": 0, "z": 0 },
                    "size": <number>,
                    "color": "#000000"
                }
            ]
        }
    ],
    "assembly": [
        {
            "part": "part_name",
            "attachTo": "other_part_name",
            "position": "top|bottom|front|back|left|right",
            "method": "sew|crochet-together"
        }
    ],
    "materials": {
        "yarnWeight": "worsted|DK|fingering",
        "hookSize": "X.Xmm",
        "colors": [
            { "name": "Color Name", "hex": "#HEXCODE", "amount": "Xg" }
        ],
        "extras": ["9mm safety eyes", "polyester stuffing", "yarn needle"]
    }
}

DESIGN TIPS:
- Always start with the main body, then head, then limbs
- Eyes should be positioned at roughly 1/3 down from top of head
- Ears attach at the top 1/4 of the head, slightly to the sides
- Arms attach at the top 1/3 of the body
- Legs attach at the bottom of the body
- Make cute proportions: larger heads, smaller bodies for "kawaii" style`;

/**
 * Build user prompt for amigurumi generation
 */
export function buildAmigurumiUserPrompt(userInput: string): string {
    return `Design an amigurumi based on this request:

"${userInput}"

Create a complete specification with all parts needed. Output ONLY the JSON specification.`;
}

/**
 * Example prompts for UI and testing
 */
export const AMIGURUMI_EXAMPLE_PROMPTS = [
    "Make me a cute little octopus with curly tentacles",
    "Design a chubby brown teddy bear",
    "Create a kawaii cat with big eyes",
    "I want a small penguin with a bow tie",
    "Make a friendly dragon with tiny wings",
    "Design a simple round bee",
    "Create a bunny rabbit for Easter",
];

/**
 * Recovery prompt for failed generation
 */
export const AMIGURUMI_RECOVERY_PROMPT = `The previous response was not valid JSON. Please output ONLY a valid JSON object following the exact format specified. Start with { and end with }. Do not include any text before or after the JSON.`;
