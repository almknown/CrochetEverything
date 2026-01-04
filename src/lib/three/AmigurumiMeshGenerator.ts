/**
 * Amigurumi Mesh Generator
 * Generates 3D meshes for amigurumi body parts with realistic stitch textures
 * 
 * This implements yarn-level simulation using simplified geometric representations
 * for spheres, cylinders, cones, and limbs - the building blocks of amigurumi
 */

import { AIAmigurumiSpec, AmigurumiPart, AssemblyInstruction } from '../ai/amigurumi-prompts';
import {
    Vec3,
    StitchGeometry,
    STITCH_LIBRARY,
    DEFAULT_YARN,
    YarnProperties,
    sampleBezierCurve,
    generateTubeGeometry,
    addVec3,
    scaleVec3,
    normalizeVec3,
    crossVec3,
} from './stitch-geometry';

/**
 * Mesh data for a single amigurumi part
 */
export interface PartMeshData {
    name: string;
    vertices: number[];
    indices: number[];
    normals: number[];
    colors: number[];
    bounds: {
        minX: number; maxX: number;
        minY: number; maxY: number;
        minZ: number; maxZ: number;
    };
    stitchCount: number;
    roundCount: number;
}

/**
 * Complete amigurumi mesh data
 */
export interface AmigurumiMeshData {
    parts: PartMeshData[];
    totalVertices: number;
    totalTriangles: number;
    bounds: {
        minX: number; maxX: number;
        minY: number; maxY: number;
        minZ: number; maxZ: number;
    };
}

/**
 * Round data for pattern generation
 */
export interface RoundData {
    roundNumber: number;
    stitchCount: number;
    radius: number;
    yPosition: number;
    stitches: { type: 'sc' | 'inc' | 'dec'; position: Vec3 }[];
}

// ================================================================
// MAIN GENERATOR FUNCTIONS
// ================================================================

/**
 * Generate complete amigurumi mesh from AI specification
 */
export function generateAmigurumiMesh(spec: AIAmigurumiSpec): AmigurumiMeshData {
    const yarnProps: YarnProperties = {
        ...DEFAULT_YARN,
        color: spec.materials.colors[0]?.hex || '#F5DEB3',
    };

    // Generate mesh for each part
    const partMeshes: PartMeshData[] = spec.parts.map(part => {
        const partYarn = { ...yarnProps, color: part.color };
        return generatePartMesh(part, partYarn);
    });

    // Apply assembly transformations
    const assembledMeshes = applyAssembly(partMeshes, spec.assembly, spec.parts);

    // Calculate overall bounds
    const bounds = calculateOverallBounds(assembledMeshes);

    // Count totals
    const totalVertices = assembledMeshes.reduce((sum, p) => sum + p.vertices.length / 3, 0);
    const totalTriangles = assembledMeshes.reduce((sum, p) => sum + p.indices.length / 3, 0);

    return {
        parts: assembledMeshes,
        totalVertices,
        totalTriangles,
        bounds,
    };
}

/**
 * Generate mesh for a single part
 */
export function generatePartMesh(part: AmigurumiPart, yarn: YarnProperties): PartMeshData {
    switch (part.type) {
        case 'sphere':
            return generateSphereMesh(part, yarn);
        case 'cylinder':
            return generateCylinderMesh(part, yarn);
        case 'cone':
            return generateConeMesh(part, yarn);
        case 'oval':
            return generateOvalMesh(part, yarn);
        case 'limb':
            return generateLimbMesh(part, yarn);
        case 'flat-circle':
            return generateFlatCircleMesh(part, yarn);
        default:
            return generateSphereMesh(part, yarn);
    }
}

// ================================================================
// SHAPE GENERATORS
// ================================================================

/**
 * Generate sphere mesh with concentric rounds
 * Standard amigurumi sphere: increase to equator, then decrease
 */
function generateSphereMesh(part: AmigurumiPart, yarn: YarnProperties): PartMeshData {
    const diameter = part.dimensions.diameter || 20;
    const radius = diameter / 2;
    const startStitches = 6;

    // Calculate rounds needed (roughly 2 * radius)
    const totalRounds = Math.max(4, Math.round(radius * 0.8));
    const equatorRound = Math.floor(totalRounds / 2);

    const vertices: number[] = [];
    const indices: number[] = [];
    const normals: number[] = [];
    const colors: number[] = [];
    const [r, g, b] = hexToRgb(yarn.color);

    let stitchCount = 0;
    const rounds: RoundData[] = [];

    // Generate rounds
    for (let round = 0; round < totalRounds; round++) {
        // Calculate stitch count for this round
        let roundStitches: number;
        let roundRadius: number;

        if (round < equatorRound) {
            // Increasing rounds
            roundStitches = startStitches * (round + 1);
            // Spherical radius at this height
            const heightRatio = (round + 0.5) / equatorRound;
            roundRadius = radius * Math.sin(heightRatio * Math.PI / 2);
        } else if (round === equatorRound) {
            // Equator - maximum
            roundStitches = startStitches * (equatorRound + 1);
            roundRadius = radius;
        } else {
            // Decreasing rounds
            const decreaseRound = round - equatorRound;
            const remainingRounds = totalRounds - equatorRound - 1;
            roundStitches = Math.max(startStitches, startStitches * (equatorRound + 1 - decreaseRound));
            const heightRatio = 1 - (decreaseRound / remainingRounds);
            roundRadius = radius * Math.sin(heightRatio * Math.PI / 2);
        }

        // Y position based on spherical geometry
        const yRatio = round / (totalRounds - 1);
        const y = radius * Math.cos(Math.PI * (1 - yRatio)) * 0.5 + radius * 0.5;

        rounds.push({
            roundNumber: round + 1,
            stitchCount: roundStitches,
            radius: roundRadius,
            yPosition: y,
            stitches: [],
        });

        // Generate stitch positions around the circle
        for (let s = 0; s < roundStitches; s++) {
            const angle = (s / roundStitches) * Math.PI * 2;
            const x = Math.cos(angle) * roundRadius;
            const z = Math.sin(angle) * roundRadius;

            // Generate yarn geometry for this stitch
            const stitchMesh = generateStitchMesh(
                { x, y, z },
                angle,
                yarn,
                STITCH_LIBRARY.sc
            );

            // Merge into main arrays
            const vertexOffset = vertices.length / 3;
            vertices.push(...stitchMesh.vertices);
            normals.push(...stitchMesh.normals);

            for (const idx of stitchMesh.indices) {
                indices.push(idx + vertexOffset);
            }

            // Color each vertex
            for (let v = 0; v < stitchMesh.vertices.length / 3; v++) {
                colors.push(r, g, b);
            }

            stitchCount++;
        }
    }

    const bounds = calculateBounds(vertices);

    return {
        name: part.name,
        vertices,
        indices,
        normals,
        colors,
        bounds,
        stitchCount,
        roundCount: totalRounds,
    };
}

/**
 * Generate cylinder mesh
 * Flat circle top/bottom with constant diameter body
 */
function generateCylinderMesh(part: AmigurumiPart, yarn: YarnProperties): PartMeshData {
    const diameter = part.dimensions.diameter || 15;
    const height = part.dimensions.height || 30;
    const radius = diameter / 2;
    const startStitches = 6;

    const vertices: number[] = [];
    const indices: number[] = [];
    const normals: number[] = [];
    const colors: number[] = [];
    const [r, g, b] = hexToRgb(yarn.color);

    let stitchCount = 0;

    // Bottom circle rounds (increasing)
    const bottomRounds = Math.ceil(radius / 2);
    for (let round = 0; round < bottomRounds; round++) {
        const roundStitches = startStitches * (round + 1);
        const roundRadius = ((round + 1) / bottomRounds) * radius;
        const y = 0;

        for (let s = 0; s < roundStitches; s++) {
            const angle = (s / roundStitches) * Math.PI * 2;
            const x = Math.cos(angle) * roundRadius;
            const z = Math.sin(angle) * roundRadius;

            const stitchMesh = generateStitchMesh({ x, y, z }, angle, yarn, STITCH_LIBRARY.sc);
            const vertexOffset = vertices.length / 3;

            vertices.push(...stitchMesh.vertices);
            normals.push(...stitchMesh.normals);
            for (const idx of stitchMesh.indices) indices.push(idx + vertexOffset);
            for (let v = 0; v < stitchMesh.vertices.length / 3; v++) colors.push(r, g, b);

            stitchCount++;
        }
    }

    // Body rounds (constant)
    const bodyRounds = Math.ceil(height / 2);
    const bodyStitches = startStitches * bottomRounds;
    for (let round = 0; round < bodyRounds; round++) {
        const y = (round / bodyRounds) * height;

        for (let s = 0; s < bodyStitches; s++) {
            const angle = (s / bodyStitches) * Math.PI * 2;
            const x = Math.cos(angle) * radius;
            const z = Math.sin(angle) * radius;

            const stitchMesh = generateStitchMesh({ x, y, z }, angle, yarn, STITCH_LIBRARY.sc);
            const vertexOffset = vertices.length / 3;

            vertices.push(...stitchMesh.vertices);
            normals.push(...stitchMesh.normals);
            for (const idx of stitchMesh.indices) indices.push(idx + vertexOffset);
            for (let v = 0; v < stitchMesh.vertices.length / 3; v++) colors.push(r, g, b);

            stitchCount++;
        }
    }

    // Top circle rounds (decreasing to close)
    for (let round = bottomRounds - 1; round >= 0; round--) {
        const roundStitches = startStitches * (round + 1);
        const roundRadius = ((round + 1) / bottomRounds) * radius;
        const y = height;

        for (let s = 0; s < roundStitches; s++) {
            const angle = (s / roundStitches) * Math.PI * 2;
            const x = Math.cos(angle) * roundRadius;
            const z = Math.sin(angle) * roundRadius;

            const stitchMesh = generateStitchMesh({ x, y, z }, angle, yarn, STITCH_LIBRARY.sc);
            const vertexOffset = vertices.length / 3;

            vertices.push(...stitchMesh.vertices);
            normals.push(...stitchMesh.normals);
            for (const idx of stitchMesh.indices) indices.push(idx + vertexOffset);
            for (let v = 0; v < stitchMesh.vertices.length / 3; v++) colors.push(r, g, b);

            stitchCount++;
        }
    }

    const bounds = calculateBounds(vertices);

    return {
        name: part.name,
        vertices,
        indices,
        normals,
        colors,
        bounds,
        stitchCount,
        roundCount: bottomRounds * 2 + bodyRounds,
    };
}

/**
 * Generate cone mesh
 * Decreasing from base to tip
 */
function generateConeMesh(part: AmigurumiPart, yarn: YarnProperties): PartMeshData {
    const baseDiameter = part.dimensions.startDiameter || part.dimensions.diameter || 20;
    const tipDiameter = part.dimensions.endDiameter || 2;
    const height = part.dimensions.height || 25;
    const baseRadius = baseDiameter / 2;
    const tipRadius = tipDiameter / 2;
    const startStitches = 6;

    const vertices: number[] = [];
    const indices: number[] = [];
    const normals: number[] = [];
    const colors: number[] = [];
    const [r, g, b] = hexToRgb(yarn.color);

    let stitchCount = 0;

    // Calculate rounds
    const totalRounds = Math.max(4, Math.round(height / 2));

    for (let round = 0; round < totalRounds; round++) {
        const t = round / (totalRounds - 1);
        const currentRadius = baseRadius + (tipRadius - baseRadius) * t;
        const roundStitches = Math.max(startStitches, Math.round(startStitches + (currentRadius / baseRadius) * startStitches));
        const y = t * height;

        for (let s = 0; s < roundStitches; s++) {
            const angle = (s / roundStitches) * Math.PI * 2;
            const x = Math.cos(angle) * currentRadius;
            const z = Math.sin(angle) * currentRadius;

            const stitchMesh = generateStitchMesh({ x, y, z }, angle, yarn, STITCH_LIBRARY.sc);
            const vertexOffset = vertices.length / 3;

            vertices.push(...stitchMesh.vertices);
            normals.push(...stitchMesh.normals);
            for (const idx of stitchMesh.indices) indices.push(idx + vertexOffset);
            for (let v = 0; v < stitchMesh.vertices.length / 3; v++) colors.push(r, g, b);

            stitchCount++;
        }
    }

    const bounds = calculateBounds(vertices);

    return {
        name: part.name,
        vertices,
        indices,
        normals,
        colors,
        bounds,
        stitchCount,
        roundCount: totalRounds,
    };
}

/**
 * Generate oval mesh
 * Elongated sphere
 */
function generateOvalMesh(part: AmigurumiPart, yarn: YarnProperties): PartMeshData {
    const length = part.dimensions.length || 30;
    const width = part.dimensions.width || 20;
    const radiusX = length / 2;
    const radiusZ = width / 2;
    const startStitches = 6;

    const vertices: number[] = [];
    const indices: number[] = [];
    const normals: number[] = [];
    const colors: number[] = [];
    const [r, g, b] = hexToRgb(yarn.color);

    let stitchCount = 0;

    const totalRounds = Math.max(6, Math.round((length + width) / 4));
    const equatorRound = Math.floor(totalRounds / 2);

    for (let round = 0; round < totalRounds; round++) {
        let roundStitches: number;
        let scaleX: number;
        let scaleZ: number;

        if (round < equatorRound) {
            roundStitches = startStitches * (round + 1);
            const ratio = (round + 0.5) / equatorRound;
            scaleX = radiusX * Math.sin(ratio * Math.PI / 2);
            scaleZ = radiusZ * Math.sin(ratio * Math.PI / 2);
        } else if (round === equatorRound) {
            roundStitches = startStitches * (equatorRound + 1);
            scaleX = radiusX;
            scaleZ = radiusZ;
        } else {
            const decreaseRound = round - equatorRound;
            roundStitches = Math.max(startStitches, startStitches * (equatorRound + 1 - decreaseRound));
            const ratio = 1 - (decreaseRound / (totalRounds - equatorRound - 1));
            scaleX = radiusX * Math.sin(ratio * Math.PI / 2);
            scaleZ = radiusZ * Math.sin(ratio * Math.PI / 2);
        }

        const yRatio = round / (totalRounds - 1);
        const y = width * 0.4 * Math.cos(Math.PI * (1 - yRatio)) + width * 0.4;

        for (let s = 0; s < roundStitches; s++) {
            const angle = (s / roundStitches) * Math.PI * 2;
            const x = Math.cos(angle) * scaleX;
            const z = Math.sin(angle) * scaleZ;

            const stitchMesh = generateStitchMesh({ x, y, z }, angle, yarn, STITCH_LIBRARY.sc);
            const vertexOffset = vertices.length / 3;

            vertices.push(...stitchMesh.vertices);
            normals.push(...stitchMesh.normals);
            for (const idx of stitchMesh.indices) indices.push(idx + vertexOffset);
            for (let v = 0; v < stitchMesh.vertices.length / 3; v++) colors.push(r, g, b);

            stitchCount++;
        }
    }

    const bounds = calculateBounds(vertices);

    return {
        name: part.name,
        vertices,
        indices,
        normals,
        colors,
        bounds,
        stitchCount,
        roundCount: totalRounds,
    };
}

/**
 * Generate limb mesh
 * Cylinder with rounded/tapered ends
 */
function generateLimbMesh(part: AmigurumiPart, yarn: YarnProperties): PartMeshData {
    const diameter = part.dimensions.diameter || 10;
    const length = part.dimensions.length || part.dimensions.height || 25;
    const radius = diameter / 2;
    const startStitches = 6;

    const vertices: number[] = [];
    const indices: number[] = [];
    const normals: number[] = [];
    const colors: number[] = [];
    const [r, g, b] = hexToRgb(yarn.color);

    let stitchCount = 0;

    // Rounded start (half sphere)
    const capRounds = Math.ceil(radius / 2);
    for (let round = 0; round < capRounds; round++) {
        const roundStitches = startStitches * (round + 1);
        const roundRadius = ((round + 1) / capRounds) * radius;
        const y = -radius + (round / capRounds) * radius;

        for (let s = 0; s < roundStitches; s++) {
            const angle = (s / roundStitches) * Math.PI * 2;
            const x = Math.cos(angle) * roundRadius;
            const z = Math.sin(angle) * roundRadius;

            const stitchMesh = generateStitchMesh({ x, y, z }, angle, yarn, STITCH_LIBRARY.sc);
            const vertexOffset = vertices.length / 3;

            vertices.push(...stitchMesh.vertices);
            normals.push(...stitchMesh.normals);
            for (const idx of stitchMesh.indices) indices.push(idx + vertexOffset);
            for (let v = 0; v < stitchMesh.vertices.length / 3; v++) colors.push(r, g, b);

            stitchCount++;
        }
    }

    // Main body
    const bodyRounds = Math.ceil(length / 2);
    const bodyStitches = startStitches * capRounds;
    for (let round = 0; round < bodyRounds; round++) {
        const y = (round / bodyRounds) * length;

        for (let s = 0; s < bodyStitches; s++) {
            const angle = (s / bodyStitches) * Math.PI * 2;
            const x = Math.cos(angle) * radius;
            const z = Math.sin(angle) * radius;

            const stitchMesh = generateStitchMesh({ x, y, z }, angle, yarn, STITCH_LIBRARY.sc);
            const vertexOffset = vertices.length / 3;

            vertices.push(...stitchMesh.vertices);
            normals.push(...stitchMesh.normals);
            for (const idx of stitchMesh.indices) indices.push(idx + vertexOffset);
            for (let v = 0; v < stitchMesh.vertices.length / 3; v++) colors.push(r, g, b);

            stitchCount++;
        }
    }

    // Rounded end (half sphere, reversed)
    for (let round = capRounds - 1; round >= 0; round--) {
        const roundStitches = startStitches * (round + 1);
        const roundRadius = ((round + 1) / capRounds) * radius;
        const y = length + ((capRounds - round - 1) / capRounds) * radius;

        for (let s = 0; s < roundStitches; s++) {
            const angle = (s / roundStitches) * Math.PI * 2;
            const x = Math.cos(angle) * roundRadius;
            const z = Math.sin(angle) * roundRadius;

            const stitchMesh = generateStitchMesh({ x, y, z }, angle, yarn, STITCH_LIBRARY.sc);
            const vertexOffset = vertices.length / 3;

            vertices.push(...stitchMesh.vertices);
            normals.push(...stitchMesh.normals);
            for (const idx of stitchMesh.indices) indices.push(idx + vertexOffset);
            for (let v = 0; v < stitchMesh.vertices.length / 3; v++) colors.push(r, g, b);

            stitchCount++;
        }
    }

    const bounds = calculateBounds(vertices);

    return {
        name: part.name,
        vertices,
        indices,
        normals,
        colors,
        bounds,
        stitchCount,
        roundCount: capRounds * 2 + bodyRounds,
    };
}

/**
 * Generate flat circle mesh
 * For ears, patches, decorations
 */
function generateFlatCircleMesh(part: AmigurumiPart, yarn: YarnProperties): PartMeshData {
    const diameter = part.dimensions.diameter || 10;
    const radius = diameter / 2;
    const startStitches = 6;

    const vertices: number[] = [];
    const indices: number[] = [];
    const normals: number[] = [];
    const colors: number[] = [];
    const [r, g, b] = hexToRgb(yarn.color);

    let stitchCount = 0;

    const totalRounds = Math.max(2, Math.ceil(radius / 2));

    for (let round = 0; round < totalRounds; round++) {
        const roundStitches = startStitches * (round + 1);
        const roundRadius = ((round + 1) / totalRounds) * radius;
        const y = 0;

        for (let s = 0; s < roundStitches; s++) {
            const angle = (s / roundStitches) * Math.PI * 2;
            const x = Math.cos(angle) * roundRadius;
            const z = Math.sin(angle) * roundRadius;

            const stitchMesh = generateStitchMesh({ x, y, z }, angle, yarn, STITCH_LIBRARY.sc);
            const vertexOffset = vertices.length / 3;

            vertices.push(...stitchMesh.vertices);
            normals.push(...stitchMesh.normals);
            for (const idx of stitchMesh.indices) indices.push(idx + vertexOffset);
            for (let v = 0; v < stitchMesh.vertices.length / 3; v++) colors.push(r, g, b);

            stitchCount++;
        }
    }

    const bounds = calculateBounds(vertices);

    return {
        name: part.name,
        vertices,
        indices,
        normals,
        colors,
        bounds,
        stitchCount,
        roundCount: totalRounds,
    };
}

// ================================================================
// STITCH MESH GENERATION
// ================================================================

/**
 * Generate mesh for a single stitch at a given position
 */
function generateStitchMesh(
    position: Vec3,
    rotation: number,
    yarn: YarnProperties,
    stitch: StitchGeometry
): { vertices: number[]; indices: number[]; normals: number[] } {
    const allVertices: number[] = [];
    const allIndices: number[] = [];
    const allNormals: number[] = [];

    // Sample each yarn path in the stitch
    for (const curve of stitch.yarnPaths) {
        const samples = sampleBezierCurve(curve, 6);

        // Transform samples to world position with rotation
        const transformedSamples = samples.map(s => {
            const rotX = s.x * Math.cos(rotation) - s.z * Math.sin(rotation);
            const rotZ = s.x * Math.sin(rotation) + s.z * Math.cos(rotation);

            return {
                x: position.x + rotX * 0.3,
                y: position.y + s.y * 0.3,
                z: position.z + rotZ * 0.3,
            };
        });

        // Generate tube geometry
        const tube = generateTubeGeometry(
            transformedSamples,
            yarn.radius * stitch.yarnRadiusFactor,
            yarn.segments
        );

        // Merge into arrays
        const vertexOffset = allVertices.length / 3;
        allVertices.push(...tube.vertices);
        allNormals.push(...tube.normals);

        for (const idx of tube.indices) {
            allIndices.push(idx + vertexOffset);
        }
    }

    return {
        vertices: allVertices,
        indices: allIndices,
        normals: allNormals,
    };
}

// ================================================================
// ASSEMBLY FUNCTIONS
// ================================================================

/**
 * Apply assembly transformations to position parts correctly
 */
function applyAssembly(
    partMeshes: PartMeshData[],
    assembly: AssemblyInstruction[],
    partSpecs: AmigurumiPart[]
): PartMeshData[] {
    // Create a map of part meshes by name
    const meshMap = new Map<string, PartMeshData>();
    for (const mesh of partMeshes) {
        meshMap.set(mesh.name, mesh);
    }

    // Create a map of part specs by name
    const specMap = new Map<string, AmigurumiPart>();
    for (const spec of partSpecs) {
        specMap.set(spec.name, spec);
    }

    // Apply each assembly instruction
    for (const inst of assembly) {
        const partMesh = meshMap.get(inst.part);
        const targetMesh = meshMap.get(inst.attachTo);

        if (!partMesh || !targetMesh) continue;

        // Calculate attachment position based on target bounds
        let offset: Vec3 = { x: 0, y: 0, z: 0 };

        switch (inst.position) {
            case 'top':
                offset = {
                    x: 0,
                    y: targetMesh.bounds.maxY - partMesh.bounds.minY,
                    z: 0
                };
                break;
            case 'bottom':
                offset = {
                    x: 0,
                    y: targetMesh.bounds.minY - partMesh.bounds.maxY,
                    z: 0
                };
                break;
            case 'front':
                offset = {
                    x: 0,
                    y: (targetMesh.bounds.minY + targetMesh.bounds.maxY) / 2,
                    z: targetMesh.bounds.maxZ - partMesh.bounds.minZ
                };
                break;
            case 'back':
                offset = {
                    x: 0,
                    y: (targetMesh.bounds.minY + targetMesh.bounds.maxY) / 2,
                    z: targetMesh.bounds.minZ - partMesh.bounds.maxZ
                };
                break;
            case 'left':
                offset = {
                    x: targetMesh.bounds.minX - partMesh.bounds.maxX,
                    y: (targetMesh.bounds.minY + targetMesh.bounds.maxY) / 2,
                    z: 0
                };
                break;
            case 'right':
                offset = {
                    x: targetMesh.bounds.maxX - partMesh.bounds.minX,
                    y: (targetMesh.bounds.minY + targetMesh.bounds.maxY) / 2,
                    z: 0
                };
                break;
        }

        // Apply offset to all vertices
        const newVertices: number[] = [];
        for (let i = 0; i < partMesh.vertices.length; i += 3) {
            newVertices.push(
                partMesh.vertices[i] + offset.x,
                partMesh.vertices[i + 1] + offset.y,
                partMesh.vertices[i + 2] + offset.z
            );
        }

        partMesh.vertices = newVertices;
        partMesh.bounds = calculateBounds(newVertices);
    }

    return partMeshes;
}

// ================================================================
// UTILITY FUNCTIONS
// ================================================================

function hexToRgb(hex: string): [number, number, number] {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return [0.96, 0.87, 0.70];

    return [
        parseInt(result[1], 16) / 255,
        parseInt(result[2], 16) / 255,
        parseInt(result[3], 16) / 255,
    ];
}

function calculateBounds(vertices: number[]): PartMeshData['bounds'] {
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;

    for (let i = 0; i < vertices.length; i += 3) {
        minX = Math.min(minX, vertices[i]);
        maxX = Math.max(maxX, vertices[i]);
        minY = Math.min(minY, vertices[i + 1]);
        maxY = Math.max(maxY, vertices[i + 1]);
        minZ = Math.min(minZ, vertices[i + 2]);
        maxZ = Math.max(maxZ, vertices[i + 2]);
    }

    // Handle empty vertices
    if (minX === Infinity) {
        return { minX: 0, maxX: 1, minY: 0, maxY: 1, minZ: 0, maxZ: 1 };
    }

    return { minX, maxX, minY, maxY, minZ, maxZ };
}

function calculateOverallBounds(parts: PartMeshData[]): AmigurumiMeshData['bounds'] {
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;

    for (const part of parts) {
        minX = Math.min(minX, part.bounds.minX);
        maxX = Math.max(maxX, part.bounds.maxX);
        minY = Math.min(minY, part.bounds.minY);
        maxY = Math.max(maxY, part.bounds.maxY);
        minZ = Math.min(minZ, part.bounds.minZ);
        maxZ = Math.max(maxZ, part.bounds.maxZ);
    }

    if (minX === Infinity) {
        return { minX: 0, maxX: 1, minY: 0, maxY: 1, minZ: 0, maxZ: 1 };
    }

    return { minX, maxX, minY, maxY, minZ, maxZ };
}

/**
 * Serialize amigurumi mesh data for storage
 */
export function serializeAmigurumiMesh(mesh: AmigurumiMeshData): string {
    return JSON.stringify(mesh);
}

/**
 * Deserialize amigurumi mesh data from storage
 */
export function deserializeAmigurumiMesh(json: string): AmigurumiMeshData {
    return JSON.parse(json);
}
