/**
 * Stitch Geometry Library
 * Parametric definitions for crochet stitch 3D geometry
 * Used for realistic yarn-level visualization
 */

/**
 * 3D Vector type
 */
export interface Vec3 {
    x: number;
    y: number;
    z: number;
}

/**
 * Bezier control points for yarn path
 */
export interface BezierCurve {
    p0: Vec3;
    p1: Vec3;
    p2: Vec3;
    p3: Vec3;
}

/**
 * Connection points for stitch linking
 */
export interface StitchConnections {
    top: Vec3;
    bottom: Vec3;
    left: Vec3;
    right: Vec3;
    loopCenter: Vec3;
}

/**
 * Complete stitch geometry definition
 */
export interface StitchGeometry {
    name: string;
    abbreviation: string;
    // Physical dimensions in stitch-units
    width: number;
    height: number;
    depth: number;
    // Yarn path as bezier curves
    yarnPaths: BezierCurve[];
    // Where this stitch connects to others
    connections: StitchConnections;
    // Yarn thickness factor (1.0 = standard)
    yarnRadiusFactor: number;
}

/**
 * Yarn properties for rendering
 */
export interface YarnProperties {
    radius: number;         // Base radius in units
    segments: number;       // Tube segments for smoothness
    color: string;          // Hex color
    fuzz: number;           // Surface fuzz amount (0-1)
    twist: number;          // Twist per unit length
}

/**
 * Default yarn properties
 */
export const DEFAULT_YARN: YarnProperties = {
    radius: 0.15,
    segments: 8,
    color: '#F5DEB3',
    fuzz: 0.1,
    twist: 0.5,
};

// ================================================================
// STITCH GEOMETRY DEFINITIONS
// Based on research of crochet stitch structure
// ================================================================

/**
 * Single Crochet (sc) - the foundation stitch for amigurumi
 * Creates a tight, dense fabric
 */
export const SC_STITCH: StitchGeometry = {
    name: 'Single Crochet',
    abbreviation: 'sc',
    width: 1.0,
    height: 1.0,
    depth: 0.5,
    yarnPaths: [
        // Main loop entering from bottom
        {
            p0: { x: 0, y: 0, z: 0 },
            p1: { x: 0.2, y: 0.3, z: 0.2 },
            p2: { x: 0.3, y: 0.6, z: 0.3 },
            p3: { x: 0, y: 0.5, z: 0.4 },
        },
        // Top of stitch (V shape)
        {
            p0: { x: 0, y: 0.5, z: 0.4 },
            p1: { x: -0.3, y: 0.7, z: 0.3 },
            p2: { x: -0.3, y: 0.9, z: 0.2 },
            p3: { x: 0, y: 1.0, z: 0.1 },
        },
        // Right side of V
        {
            p0: { x: 0, y: 0.5, z: 0.4 },
            p1: { x: 0.3, y: 0.7, z: 0.3 },
            p2: { x: 0.3, y: 0.9, z: 0.2 },
            p3: { x: 0, y: 1.0, z: 0.1 },
        },
    ],
    connections: {
        top: { x: 0, y: 1.0, z: 0.1 },
        bottom: { x: 0, y: 0, z: 0 },
        left: { x: -0.5, y: 0.5, z: 0.25 },
        right: { x: 0.5, y: 0.5, z: 0.25 },
        loopCenter: { x: 0, y: 0.5, z: 0.4 },
    },
    yarnRadiusFactor: 1.0,
};

/**
 * Increase stitch - 2 sc in same stitch
 * Used for expanding diameter
 */
export const INC_STITCH: StitchGeometry = {
    name: 'Increase',
    abbreviation: 'inc',
    width: 2.0,
    height: 1.0,
    depth: 0.5,
    yarnPaths: [
        // First sc of increase
        ...SC_STITCH.yarnPaths.map(curve => ({
            p0: { x: curve.p0.x - 0.5, y: curve.p0.y, z: curve.p0.z },
            p1: { x: curve.p1.x - 0.5, y: curve.p1.y, z: curve.p1.z },
            p2: { x: curve.p2.x - 0.5, y: curve.p2.y, z: curve.p2.z },
            p3: { x: curve.p3.x - 0.5, y: curve.p3.y, z: curve.p3.z },
        })),
        // Second sc of increase
        ...SC_STITCH.yarnPaths.map(curve => ({
            p0: { x: curve.p0.x + 0.5, y: curve.p0.y, z: curve.p0.z },
            p1: { x: curve.p1.x + 0.5, y: curve.p1.y, z: curve.p1.z },
            p2: { x: curve.p2.x + 0.5, y: curve.p2.y, z: curve.p2.z },
            p3: { x: curve.p3.x + 0.5, y: curve.p3.y, z: curve.p3.z },
        })),
    ],
    connections: {
        top: { x: 0, y: 1.0, z: 0.1 },
        bottom: { x: 0, y: 0, z: 0 },
        left: { x: -1.0, y: 0.5, z: 0.25 },
        right: { x: 1.0, y: 0.5, z: 0.25 },
        loopCenter: { x: 0, y: 0.5, z: 0.4 },
    },
    yarnRadiusFactor: 1.0,
};

/**
 * Decrease stitch - combines 2 stitches into 1
 * Used for contracting diameter
 */
export const DEC_STITCH: StitchGeometry = {
    name: 'Decrease',
    abbreviation: 'dec',
    width: 0.5,
    height: 1.0,
    depth: 0.6,
    yarnPaths: [
        // Compressed loop structure
        {
            p0: { x: -0.25, y: 0, z: 0 },
            p1: { x: -0.1, y: 0.3, z: 0.3 },
            p2: { x: 0.1, y: 0.5, z: 0.4 },
            p3: { x: 0, y: 0.5, z: 0.5 },
        },
        {
            p0: { x: 0.25, y: 0, z: 0 },
            p1: { x: 0.1, y: 0.3, z: 0.3 },
            p2: { x: -0.1, y: 0.5, z: 0.4 },
            p3: { x: 0, y: 0.5, z: 0.5 },
        },
        // Single top
        {
            p0: { x: 0, y: 0.5, z: 0.5 },
            p1: { x: 0, y: 0.7, z: 0.3 },
            p2: { x: 0, y: 0.9, z: 0.1 },
            p3: { x: 0, y: 1.0, z: 0 },
        },
    ],
    connections: {
        top: { x: 0, y: 1.0, z: 0 },
        bottom: { x: 0, y: 0, z: 0 },
        left: { x: -0.25, y: 0.5, z: 0.25 },
        right: { x: 0.25, y: 0.5, z: 0.25 },
        loopCenter: { x: 0, y: 0.5, z: 0.5 },
    },
    yarnRadiusFactor: 1.0,
};

/**
 * Magic Ring start - adjustable loop
 */
export const MR_STITCH: StitchGeometry = {
    name: 'Magic Ring',
    abbreviation: 'mr',
    width: 1.0,
    height: 0.5,
    depth: 0.3,
    yarnPaths: [
        // Circular foundation
        {
            p0: { x: 1, y: 0, z: 0 },
            p1: { x: 1, y: 0.55, z: 0 },
            p2: { x: 0.55, y: 1, z: 0 },
            p3: { x: 0, y: 1, z: 0 },
        },
        {
            p0: { x: 0, y: 1, z: 0 },
            p1: { x: -0.55, y: 1, z: 0 },
            p2: { x: -1, y: 0.55, z: 0 },
            p3: { x: -1, y: 0, z: 0 },
        },
    ],
    connections: {
        top: { x: 0, y: 0.5, z: 0 },
        bottom: { x: 0, y: 0, z: 0 },
        left: { x: -1, y: 0, z: 0 },
        right: { x: 1, y: 0, z: 0 },
        loopCenter: { x: 0, y: 0, z: 0 },
    },
    yarnRadiusFactor: 1.2,
};

/**
 * Stitch library - all available stitches
 */
export const STITCH_LIBRARY: Record<string, StitchGeometry> = {
    sc: SC_STITCH,
    inc: INC_STITCH,
    dec: DEC_STITCH,
    mr: MR_STITCH,
};

// ================================================================
// GEOMETRY UTILITIES
// ================================================================

/**
 * Evaluate a bezier curve at parameter t (0-1)
 */
export function evaluateBezier(curve: BezierCurve, t: number): Vec3 {
    const t2 = t * t;
    const t3 = t2 * t;
    const mt = 1 - t;
    const mt2 = mt * mt;
    const mt3 = mt2 * mt;

    return {
        x: mt3 * curve.p0.x + 3 * mt2 * t * curve.p1.x + 3 * mt * t2 * curve.p2.x + t3 * curve.p3.x,
        y: mt3 * curve.p0.y + 3 * mt2 * t * curve.p1.y + 3 * mt * t2 * curve.p2.y + t3 * curve.p3.y,
        z: mt3 * curve.p0.z + 3 * mt2 * t * curve.p1.z + 3 * mt * t2 * curve.p2.z + t3 * curve.p3.z,
    };
}

/**
 * Sample points along a bezier curve
 */
export function sampleBezierCurve(curve: BezierCurve, segments: number): Vec3[] {
    const points: Vec3[] = [];
    for (let i = 0; i <= segments; i++) {
        points.push(evaluateBezier(curve, i / segments));
    }
    return points;
}

/**
 * Generate tube geometry along a path
 * Returns vertices and indices for a tube mesh
 */
export function generateTubeGeometry(
    pathPoints: Vec3[],
    radius: number,
    radialSegments: number = 8
): { vertices: number[]; indices: number[]; normals: number[] } {
    const vertices: number[] = [];
    const indices: number[] = [];
    const normals: number[] = [];

    for (let i = 0; i < pathPoints.length; i++) {
        const point = pathPoints[i];

        // Calculate tangent direction
        let tangent: Vec3;
        if (i === 0) {
            tangent = subtractVec3(pathPoints[1], pathPoints[0]);
        } else if (i === pathPoints.length - 1) {
            tangent = subtractVec3(pathPoints[i], pathPoints[i - 1]);
        } else {
            tangent = subtractVec3(pathPoints[i + 1], pathPoints[i - 1]);
        }
        tangent = normalizeVec3(tangent);

        // Calculate normal and binormal
        const up = { x: 0, y: 1, z: 0 };
        let normal = crossVec3(tangent, up);

        // Handle case where tangent is parallel to up
        if (lengthVec3(normal) < 0.001) {
            normal = crossVec3(tangent, { x: 1, y: 0, z: 0 });
        }
        normal = normalizeVec3(normal);
        const binormal = crossVec3(tangent, normal);

        // Generate circle of vertices around the path point
        for (let j = 0; j < radialSegments; j++) {
            const angle = (j / radialSegments) * Math.PI * 2;
            const cos = Math.cos(angle);
            const sin = Math.sin(angle);

            const offsetX = (normal.x * cos + binormal.x * sin) * radius;
            const offsetY = (normal.y * cos + binormal.y * sin) * radius;
            const offsetZ = (normal.z * cos + binormal.z * sin) * radius;

            vertices.push(
                point.x + offsetX,
                point.y + offsetY,
                point.z + offsetZ
            );

            // Normal points outward from center
            const normalVec = normalizeVec3({ x: offsetX, y: offsetY, z: offsetZ });
            normals.push(normalVec.x, normalVec.y, normalVec.z);
        }
    }

    // Generate indices for triangles
    for (let i = 0; i < pathPoints.length - 1; i++) {
        for (let j = 0; j < radialSegments; j++) {
            const a = i * radialSegments + j;
            const b = i * radialSegments + ((j + 1) % radialSegments);
            const c = (i + 1) * radialSegments + j;
            const d = (i + 1) * radialSegments + ((j + 1) % radialSegments);

            indices.push(a, b, d);
            indices.push(a, d, c);
        }
    }

    return { vertices, indices, normals };
}

// ================================================================
// VECTOR MATH UTILITIES
// ================================================================

export function addVec3(a: Vec3, b: Vec3): Vec3 {
    return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

export function subtractVec3(a: Vec3, b: Vec3): Vec3 {
    return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

export function scaleVec3(v: Vec3, s: number): Vec3 {
    return { x: v.x * s, y: v.y * s, z: v.z * s };
}

export function lengthVec3(v: Vec3): number {
    return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
}

export function normalizeVec3(v: Vec3): Vec3 {
    const len = lengthVec3(v);
    if (len === 0) return { x: 0, y: 1, z: 0 };
    return { x: v.x / len, y: v.y / len, z: v.z / len };
}

export function crossVec3(a: Vec3, b: Vec3): Vec3 {
    return {
        x: a.y * b.z - a.z * b.y,
        y: a.z * b.x - a.x * b.z,
        z: a.x * b.y - a.y * b.x,
    };
}

export function dotVec3(a: Vec3, b: Vec3): number {
    return a.x * b.x + a.y * b.y + a.z * b.z;
}
