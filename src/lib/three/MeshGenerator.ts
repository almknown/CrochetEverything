/**
 * Mesh Generator
 * Converts crochet pattern data into Three.js geometry for 3D preview
 */

import { CalculatedPattern } from '../crochet/shape-calculators';

export interface MeshData {
    vertices: number[];       // Flat array [x1,y1,z1, x2,y2,z2, ...]
    indices: number[];        // Triangle indices
    colors: number[];         // Vertex colors [r1,g1,b1, r2,g2,b2, ...]
    normals: number[];        // Vertex normals
    shape: string;
    bounds: {
        minX: number;
        maxX: number;
        minY: number;
        maxY: number;
        minZ: number;
        maxZ: number;
    };
}

/**
 * Generate mesh data for a flat pattern
 * Creates a simplified geometric representation
 */
export function generateMeshFromPattern(
    pattern: CalculatedPattern,
    colors: string[] = ['#F5DEB3']
): MeshData {
    switch (pattern.shape) {
        case 'circle':
            return generateCircleMesh(pattern, colors);
        case 'hexagon':
            return generateHexagonMesh(pattern, colors);
        case 'triangle':
            return generateTriangleMesh(pattern, colors);
        case 'oval':
            return generateOvalMesh(pattern, colors);
        case 'rectangle':
        default:
            return generateRectangleMesh(pattern, colors);
    }
}

/**
 * Generate rectangle mesh
 */
function generateRectangleMesh(pattern: CalculatedPattern, colors: string[]): MeshData {
    const width = pattern.rows[1]?.stitchCount || 10;
    const height = pattern.totalRows;

    const halfWidth = width / 2;
    const halfHeight = height / 2;
    const z = 0.1; // Small thickness

    // Create a simple box for rectangle
    const vertices: number[] = [
        // Front face
        -halfWidth, -halfHeight, z,
        halfWidth, -halfHeight, z,
        halfWidth, halfHeight, z,
        -halfWidth, halfHeight, z,
        // Back face
        -halfWidth, -halfHeight, -z,
        halfWidth, -halfHeight, -z,
        halfWidth, halfHeight, -z,
        -halfWidth, halfHeight, -z,
    ];

    const indices: number[] = [
        // Front
        0, 1, 2, 0, 2, 3,
        // Back
        5, 4, 7, 5, 7, 6,
        // Top
        3, 2, 6, 3, 6, 7,
        // Bottom
        4, 5, 1, 4, 1, 0,
        // Right
        1, 5, 6, 1, 6, 2,
        // Left
        4, 0, 3, 4, 3, 7,
    ];

    const [r, g, b] = hexToRgb(colors[0]);
    const vertexColors: number[] = [];
    for (let i = 0; i < 8; i++) {
        vertexColors.push(r, g, b);
    }

    return {
        vertices,
        indices,
        colors: vertexColors,
        normals: calculateNormals(vertices, indices),
        shape: 'rectangle',
        bounds: {
            minX: -halfWidth, maxX: halfWidth,
            minY: -halfHeight, maxY: halfHeight,
            minZ: -z, maxZ: z,
        },
    };
}

/**
 * Generate circle mesh with concentric rings
 */
function generateCircleMesh(pattern: CalculatedPattern, colors: string[]): MeshData {
    const segments = 32;
    const rounds = pattern.totalRows;
    const maxRadius = rounds * 0.5;
    const z = 0.1;

    const vertices: number[] = [];
    const indices: number[] = [];
    const vertexColors: number[] = [];

    // Center vertex
    vertices.push(0, 0, z);
    const [cr, cg, cb] = hexToRgb(colors[0]);
    vertexColors.push(cr, cg, cb);

    // Concentric rings
    for (let ring = 1; ring <= rounds; ring++) {
        const radius = (ring / rounds) * maxRadius;
        const colorIndex = ring % colors.length;
        const [r, g, b] = hexToRgb(colors[colorIndex]);

        for (let i = 0; i < segments; i++) {
            const angle = (i / segments) * Math.PI * 2;
            vertices.push(
                Math.cos(angle) * radius,
                Math.sin(angle) * radius,
                z
            );
            vertexColors.push(r, g, b);
        }
    }

    // Center triangles (first ring)
    for (let i = 0; i < segments; i++) {
        indices.push(0, i + 1, ((i + 1) % segments) + 1);
    }

    // Ring triangles
    for (let ring = 1; ring < rounds; ring++) {
        const innerStart = 1 + (ring - 1) * segments;
        const outerStart = 1 + ring * segments;

        for (let i = 0; i < segments; i++) {
            const inner1 = innerStart + i;
            const inner2 = innerStart + ((i + 1) % segments);
            const outer1 = outerStart + i;
            const outer2 = outerStart + ((i + 1) % segments);

            indices.push(inner1, outer1, outer2);
            indices.push(inner1, outer2, inner2);
        }
    }

    return {
        vertices,
        indices,
        colors: vertexColors,
        normals: calculateNormals(vertices, indices),
        shape: 'circle',
        bounds: {
            minX: -maxRadius, maxX: maxRadius,
            minY: -maxRadius, maxY: maxRadius,
            minZ: 0, maxZ: z,
        },
    };
}

/**
 * Generate hexagon mesh
 */
function generateHexagonMesh(pattern: CalculatedPattern, colors: string[]): MeshData {
    const rounds = pattern.totalRows;
    const maxRadius = rounds * 0.5;
    const z = 0.1;

    const vertices: number[] = [];
    const indices: number[] = [];
    const vertexColors: number[] = [];

    // Center
    vertices.push(0, 0, z);
    const [cr, cg, cb] = hexToRgb(colors[0]);
    vertexColors.push(cr, cg, cb);

    // Hexagonal rings
    for (let ring = 1; ring <= rounds; ring++) {
        const radius = (ring / rounds) * maxRadius;
        const colorIndex = ring % colors.length;
        const [r, g, b] = hexToRgb(colors[colorIndex]);

        for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2 - Math.PI / 6;
            vertices.push(
                Math.cos(angle) * radius,
                Math.sin(angle) * radius,
                z
            );
            vertexColors.push(r, g, b);
        }
    }

    // Center triangles
    for (let i = 0; i < 6; i++) {
        indices.push(0, i + 1, ((i + 1) % 6) + 1);
    }

    // Ring triangles
    for (let ring = 1; ring < rounds; ring++) {
        const innerStart = 1 + (ring - 1) * 6;
        const outerStart = 1 + ring * 6;

        for (let i = 0; i < 6; i++) {
            const inner1 = innerStart + i;
            const inner2 = innerStart + ((i + 1) % 6);
            const outer1 = outerStart + i;
            const outer2 = outerStart + ((i + 1) % 6);

            indices.push(inner1, outer1, outer2);
            indices.push(inner1, outer2, inner2);
        }
    }

    return {
        vertices,
        indices,
        colors: vertexColors,
        normals: calculateNormals(vertices, indices),
        shape: 'hexagon',
        bounds: {
            minX: -maxRadius, maxX: maxRadius,
            minY: -maxRadius, maxY: maxRadius,
            minZ: 0, maxZ: z,
        },
    };
}

/**
 * Generate triangle mesh
 */
function generateTriangleMesh(pattern: CalculatedPattern, colors: string[]): MeshData {
    const baseWidth = pattern.rows.length > 0 ? pattern.rows[pattern.rows.length - 1].stitchCount : 10;
    const height = pattern.totalRows;
    const z = 0.1;

    const halfBase = baseWidth / 2;

    const vertices: number[] = [
        // Front face
        0, height / 2, z,           // Top point
        -halfBase, -height / 2, z,  // Bottom left
        halfBase, -height / 2, z,   // Bottom right
        // Back face
        0, height / 2, -z,
        -halfBase, -height / 2, -z,
        halfBase, -height / 2, -z,
    ];

    const indices: number[] = [
        // Front
        0, 1, 2,
        // Back
        5, 4, 3,
        // Bottom
        1, 4, 5, 1, 5, 2,
        // Left side
        0, 3, 4, 0, 4, 1,
        // Right side
        0, 2, 5, 0, 5, 3,
    ];

    const [r, g, b] = hexToRgb(colors[0]);
    const vertexColors: number[] = [];
    for (let i = 0; i < 6; i++) {
        vertexColors.push(r, g, b);
    }

    return {
        vertices,
        indices,
        colors: vertexColors,
        normals: calculateNormals(vertices, indices),
        shape: 'triangle',
        bounds: {
            minX: -halfBase, maxX: halfBase,
            minY: -height / 2, maxY: height / 2,
            minZ: -z, maxZ: z,
        },
    };
}

/**
 * Generate oval mesh
 */
function generateOvalMesh(pattern: CalculatedPattern, colors: string[]): MeshData {
    const segments = 32;
    const width = pattern.rows[1]?.stitchCount || 10;
    const height = pattern.totalRows;
    const z = 0.1;

    const vertices: number[] = [];
    const indices: number[] = [];
    const vertexColors: number[] = [];

    // Center
    vertices.push(0, 0, z);
    const [cr, cg, cb] = hexToRgb(colors[0]);
    vertexColors.push(cr, cg, cb);

    // Oval outline
    const [r, g, b] = hexToRgb(colors[colors.length > 1 ? 1 : 0]);
    for (let i = 0; i < segments; i++) {
        const angle = (i / segments) * Math.PI * 2;
        vertices.push(
            Math.cos(angle) * width / 2,
            Math.sin(angle) * height / 2,
            z
        );
        vertexColors.push(r, g, b);
    }

    // Center triangles
    for (let i = 0; i < segments; i++) {
        indices.push(0, i + 1, ((i + 1) % segments) + 1);
    }

    return {
        vertices,
        indices,
        colors: vertexColors,
        normals: calculateNormals(vertices, indices),
        shape: 'oval',
        bounds: {
            minX: -width / 2, maxX: width / 2,
            minY: -height / 2, maxY: height / 2,
            minZ: 0, maxZ: z,
        },
    };
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function hexToRgb(hex: string): [number, number, number] {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return [0.96, 0.87, 0.70]; // Default wheat color

    return [
        parseInt(result[1], 16) / 255,
        parseInt(result[2], 16) / 255,
        parseInt(result[3], 16) / 255,
    ];
}

function calculateNormals(vertices: number[], indices: number[]): number[] {
    const normals: number[] = new Array(vertices.length).fill(0);

    // For flat patterns, normals point up (z-direction)
    for (let i = 0; i < vertices.length; i += 3) {
        normals[i] = 0;
        normals[i + 1] = 0;
        normals[i + 2] = 1;
    }

    return normals;
}

/**
 * Serialize mesh data for storage
 */
export function serializeMeshData(mesh: MeshData): string {
    return JSON.stringify(mesh);
}

/**
 * Deserialize mesh data from storage
 */
export function deserializeMeshData(json: string): MeshData {
    return JSON.parse(json);
}
