/**
 * Minimal typings for the AFRAME and THREE globals installed by the
 * `@ar-js-org/ar.js` bundle — only the surface this app actually uses.
 */

interface ThreeObject3D {
	add(child: ThreeObject3D): void;
	rotation: { x: number; y: number; z: number };
	position: { x: number; y: number; z: number };
}

interface ThreeGlobal {
	Group: new () => ThreeObject3D;
	Mesh: new (geometry: unknown, material: unknown) => ThreeObject3D;
	MeshStandardMaterial: new (parameters: { color: string }) => unknown;
	CylinderGeometry: new (
		radiusTop: number,
		radiusBottom: number,
		height: number,
		radialSegments: number,
	) => unknown;
	ConeGeometry: new (
		radius: number,
		height: number,
		radialSegments: number,
	) => unknown;
}

declare const THREE: ThreeGlobal;

interface AFrameEntity extends HTMLElement {
	setObject3D(name: string, object: ThreeObject3D): void;
}

interface AFrameComponentThis {
	el: AFrameEntity;
	data: { color: string };
}

interface AFrameGlobal {
	registerComponent(
		name: string,
		definition: {
			schema?: Record<string, unknown>;
			init?: (this: AFrameComponentThis) => void;
		},
	): void;
}

declare const AFRAME: AFrameGlobal;
