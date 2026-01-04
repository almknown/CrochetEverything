'use client';

/**
 * PatternViewer Component
 * 3D visualization of crochet patterns using Three.js
 * Supports both flat MeshData and 3D AmigurumiMeshData
 */

import { useRef, useEffect, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import { MeshData } from '@/lib/three/MeshGenerator';
import { AmigurumiMeshData, PartMeshData } from '@/lib/three/AmigurumiMeshGenerator';

// Type guard to check if mesh is AmigurumiMeshData
function isAmigurumiMesh(mesh: MeshData | AmigurumiMeshData): mesh is AmigurumiMeshData {
    return 'parts' in mesh && Array.isArray((mesh as AmigurumiMeshData).parts);
}

interface PatternViewerProps {
    meshData: MeshData | AmigurumiMeshData;
    className?: string;
    autoRotate?: boolean;
    showGrid?: boolean;
}

/**
 * Inner mesh component that renders a flat pattern
 */
function FlatPatternMesh({ meshData, autoRotate }: { meshData: MeshData; autoRotate: boolean }) {
    const meshRef = useRef<THREE.Mesh>(null);

    const geometry = useMemo(() => {
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(meshData.vertices, 3));
        geo.setIndex(meshData.indices);
        geo.setAttribute('color', new THREE.Float32BufferAttribute(meshData.colors, 3));
        geo.computeVertexNormals();
        return geo;
    }, [meshData]);

    useFrame((state, delta) => {
        if (autoRotate && meshRef.current) {
            meshRef.current.rotation.z += delta * 0.2;
        }
    });

    return (
        <mesh ref={meshRef} geometry={geometry}>
            <meshStandardMaterial vertexColors side={THREE.DoubleSide} flatShading />
        </mesh>
    );
}

/**
 * Inner component that renders amigurumi parts with yarn-level detail
 */
function AmigurumiMesh({ meshData, autoRotate }: { meshData: AmigurumiMeshData; autoRotate: boolean }) {
    const groupRef = useRef<THREE.Group>(null);

    useFrame((state, delta) => {
        if (autoRotate && groupRef.current) {
            groupRef.current.rotation.y += delta * 0.3;
        }
    });

    return (
        <group ref={groupRef}>
            {meshData.parts.map((part, index) => (
                <PartMesh key={`${part.name}-${index}`} part={part} />
            ))}
        </group>
    );
}

/**
 * Renders a single amigurumi part
 */
function PartMesh({ part }: { part: PartMeshData }) {
    const geometry = useMemo(() => {
        const geo = new THREE.BufferGeometry();
        if (part.vertices.length > 0) {
            geo.setAttribute('position', new THREE.Float32BufferAttribute(part.vertices, 3));
            if (part.indices.length > 0) {
                geo.setIndex(part.indices);
            }
            if (part.colors.length > 0) {
                geo.setAttribute('color', new THREE.Float32BufferAttribute(part.colors, 3));
            }
            geo.computeVertexNormals();
        }
        return geo;
    }, [part]);

    return (
        <mesh geometry={geometry}>
            <meshStandardMaterial
                vertexColors={part.colors.length > 0}
                side={THREE.DoubleSide}
                flatShading
                color={part.colors.length === 0 ? '#F5DEB3' : undefined}
            />
        </mesh>
    );
}


/**
 * Camera controller that adjusts based on mesh bounds
 */
function CameraController({ bounds }: { bounds: MeshData['bounds'] | AmigurumiMeshData['bounds'] }) {
    const { camera } = useThree();

    useEffect(() => {
        const maxDim = Math.max(
            bounds.maxX - bounds.minX,
            bounds.maxY - bounds.minY,
            bounds.maxZ - bounds.minZ
        );
        const cameraDistance = Math.max(15, maxDim * 2);
        camera.position.set(cameraDistance * 0.5, cameraDistance * 0.3, cameraDistance);
        camera.lookAt(0, 0, 0);
    }, [bounds, camera]);

    return null;
}

/**
 * Main PatternViewer component
 */
export function PatternViewer({
    meshData,
    className = '',
    autoRotate = true,
    showGrid = true,
}: PatternViewerProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const isAmigurumi = isAmigurumiMesh(meshData);

    return (
        <div
            ref={containerRef}
            className={`w-full h-[400px] bg-gradient-to-b from-slate-900 to-slate-800 rounded-lg overflow-hidden ${className}`}
        >
            <Canvas>
                <PerspectiveCamera makeDefault position={[0, 0, 15]} fov={50} />
                <CameraController bounds={meshData.bounds} />

                {/* Lighting */}
                <ambientLight intensity={0.5} />
                <directionalLight position={[5, 5, 5]} intensity={1} />
                <directionalLight position={[-5, -5, 5]} intensity={0.3} />

                {/* Render appropriate mesh based on type */}
                {isAmigurumi ? (
                    <AmigurumiMesh meshData={meshData} autoRotate={autoRotate} />
                ) : (
                    <FlatPatternMesh meshData={meshData} autoRotate={autoRotate} />
                )}

                {/* Grid helper */}
                {showGrid && (
                    <gridHelper
                        args={[20, 20, '#444', '#333']}
                        rotation={[Math.PI / 2, 0, 0]}
                        position={[0, 0, -0.5]}
                    />
                )}

                {/* Controls */}
                <OrbitControls
                    enablePan={true}
                    enableZoom={true}
                    enableRotate={true}
                    minDistance={5}
                    maxDistance={50}
                />
            </Canvas>
        </div>
    );
}

/**
 * Loading placeholder for PatternViewer
 */
export function PatternViewerSkeleton({ className = '' }: { className?: string }) {
    return (
        <div className={`w-full h-[400px] bg-gradient-to-b from-slate-900 to-slate-800 rounded-lg overflow-hidden flex items-center justify-center ${className}`}>
            <div className="text-slate-400 flex flex-col items-center gap-3">
                <div className="w-16 h-16 border-4 border-slate-600 border-t-pink-500 rounded-full animate-spin" />
                <span>Generating preview...</span>
            </div>
        </div>
    );
}

/**
 * Export button component for capturing the 3D view as image
 */
export function ExportButton({
    onClick,
    label = 'Export Image',
    className = ''
}: {
    onClick: () => void;
    label?: string;
    className?: string;
}) {
    return (
        <button
            onClick={onClick}
            className={`px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded-lg font-medium transition-colors ${className}`}
        >
            {label}
        </button>
    );
}

export default PatternViewer;
