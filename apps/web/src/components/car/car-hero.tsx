"use client";

/**
 * 3D car hero — replicates the working setup from the Custom-Cars-3D repo
 * (github.com/ViktorVelizarov/Custom-Cars-3D, app/page.jsx): a Canvas with a
 * camera set in onCreated, a dark background + fog, and drei <Stage> lighting.
 * Models are the same GLTFs, loaded here via useGLTF + <primitive>.
 */

import { Suspense, useMemo, useRef } from "react";

import {
  Bounds,
  Center,
  Environment,
  OrbitControls,
  Stage,
  useGLTF,
} from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

export const CARS = {
  porsche: { label: "Porsche 911", file: "/models/porsche.gltf" },
  mclaren720: { label: "McLaren 720S", file: "/models/mclaren720.gltf" },
  nissan: { label: "Nissan GT-R", file: "/models/nissan.gltf" },
  mustang: { label: "Ford Mustang", file: "/models/mustang.gltf" },
  camaro: { label: "Chevrolet Camaro", file: "/models/camaro.gltf" },
  audiA8: { label: "Audi A8", file: "/models/audiA8.gltf" },
  benz1: { label: "Mercedes-Benz", file: "/models/benz1.gltf" },
  bmwE34: { label: "BMW E34", file: "/models/bmwE34.gltf" },
} as const;

export type CarKey = keyof typeof CARS;

function Model({ url, paint = false }: { url: string; paint?: boolean }) {
  const { scene } = useGLTF(url);
  const object = useMemo(() => {
    if (!paint) return scene;
    const clone = scene.clone(true);
    recolorPaint(clone); // one fleet colour — the Porsche's silver
    return clone;
  }, [scene, paint]);
  return <primitive object={object} />;
}

/** The cars that ride the landing-page turntable. */
export const RING_CARS: readonly CarKey[] = [
  "porsche",
  "mclaren720",
  "bmwE34",
  "mustang",
];

/**
 * The Porsche's silver. The whole ring is repainted to it so the fleet reads as
 * one product line, not a car lot. Only the paint is touched (see recolorPaint).
 */
const FLEET_PAINT = new THREE.Color("#b9bdc2");

/**
 * Repaint a model's body to FLEET_PAINT while leaving glass, tyres, chrome and
 * lights alone. Heuristic: only saturated (i.e. coloured paint) materials are
 * touched; near-neutral surfaces are left as-is. Materials are cloned before
 * mutation so the shared cached GLTF is never altered.
 */
function recolorPaint(root: THREE.Object3D) {
  const hsl = { h: 0, s: 0, l: 0 };
  const repaint = (m: THREE.Material): THREE.Material => {
    const mat = m as THREE.MeshStandardMaterial;
    if (!mat.color) return m;
    mat.color.getHSL(hsl);
    // Leave near-neutral (tyres, glass, chrome, already-silver) surfaces.
    if (hsl.s <= 0.12) return m;
    const clone = mat.clone() as THREE.MeshStandardMaterial;
    clone.color.copy(FLEET_PAINT);
    return clone;
  };
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.material = Array.isArray(mesh.material)
      ? mesh.material.map(repaint)
      : repaint(mesh.material);
  });
}

/**
 * Load a car, optionally repaint it, then normalize it to a uniform size (the
 * GLTFs vary wildly) and center it on the origin. Returns the ready object and
 * the scale that gives every car the same footprint.
 */
function useNormalizedCar(url: string, paint: boolean) {
  const { scene } = useGLTF(url);
  return useMemo(() => {
    const clone = scene.clone(true);
    if (paint) recolorPaint(clone); // one fleet colour — the Porsche's silver
    const box = new THREE.Box3().setFromObject(clone);
    const size = new THREE.Vector3();
    box.getSize(size);
    const center = new THREE.Vector3();
    box.getCenter(center);
    clone.position.sub(center); // center the model on the origin
    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    return { object: clone, scale: 2.4 / maxDim }; // uniform footprint
  }, [scene, paint]);
}

/**
 * One car parked on the ring: normalized, then placed around the circle and
 * turned to face along it so the fleet looks like it's driving a roundabout.
 */
function RingCar({
  url,
  angle,
  radius,
}: {
  url: string;
  angle: number;
  radius: number;
}) {
  const { object, scale } = useNormalizedCar(url, true);
  const x = Math.sin(angle) * radius;
  const z = Math.cos(angle) * radius;
  return (
    <group position={[x, 0, z]} rotation={[0, angle + Math.PI / 2, 0]} scale={scale}>
      <primitive object={object} />
    </group>
  );
}

/** A normalized car centered on the origin — the payload of the spinning group. */
function NormalizedCar({ url, paint }: { url: string; paint: boolean }) {
  const { object, scale } = useNormalizedCar(url, paint);
  return (
    <group scale={scale}>
      <primitive object={object} />
    </group>
  );
}

/**
 * A single car on a persistent turntable. The group keeps spinning across car
 * swaps — only the model inside it changes — so the next car picks up the
 * rotation where the last one left off instead of snapping back to 0°.
 */
function SpinCar({
  url,
  paint,
  speed,
}: {
  url: string;
  paint: boolean;
  speed: number;
}) {
  const ref = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    // `speed` is on the same scale as OrbitControls autoRotateSpeed
    // (π/30 rad·s⁻¹ per unit), so the numbers stay familiar.
    if (ref.current) ref.current.rotation.y -= delta * speed * (Math.PI / 30);
  });
  return (
    <group ref={ref}>
      <Suspense fallback={null}>
        <NormalizedCar url={url} paint={paint} />
      </Suspense>
    </group>
  );
}

/** The spinning ring of cars. */
function Ring({ cars, speed = 0.35 }: { cars: readonly CarKey[]; speed?: number }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    // Negative Y spin reads as clockwise from the viewer's vantage.
    if (ref.current) ref.current.rotation.y -= delta * speed;
  });
  const radius = 3.2;
  return (
    <group ref={ref}>
      {cars.map((key, i) => (
        <RingCar
          key={key}
          url={CARS[key].file}
          angle={(i / cars.length) * Math.PI * 2}
          radius={radius}
        />
      ))}
    </group>
  );
}

/**
 * A turntable of cars orbiting the center — the landing-page hero. Same Canvas,
 * lighting and transparency story as the single-car <CarHero>, but the camera
 * pulls back to take in the whole ring.
 */
export function CarRingHero({
  cars = RING_CARS,
  className,
  transparent = false,
}: {
  cars?: readonly CarKey[];
  className?: string;
  transparent?: boolean;
}) {
  return (
    <div className={className}>
      <Canvas
        camera={{ position: [0, 3.6, 12], fov: 40 }}
        gl={{ alpha: transparent, antialias: true }}
      >
        {transparent ? null : (
          <>
            <color attach="background" args={["#101010"]} />
            <fog attach="fog" args={["#101010", 16, 44]} />
          </>
        )}
        <Stage
          environment="city"
          intensity={0.6}
          contactShadow={false}
          adjustCamera={false}
        >
          <Suspense fallback={null}>
            <Ring cars={cars} />
          </Suspense>
        </Stage>
      </Canvas>
    </div>
  );
}

export function CarHero({
  model = "nissan",
  className,
  transparent = false,
  paint = false,
  spin = false,
  spinSpeed = 14,
}: {
  model?: CarKey;
  className?: string;
  /** Transparent canvas (no background/fog) — for floating the car over a scene. */
  transparent?: boolean;
  /** Repaint the body to the shared fleet silver. */
  paint?: boolean;
  /** Spin the model on a persistent turntable (rotation carries across swaps). */
  spin?: boolean;
  /** Spin rate on the OrbitControls autoRotateSpeed scale (spin mode only). */
  spinSpeed?: number;
}) {
  const url = CARS[model].file;

  // Spin mode: rotate the model (not the camera) so swapping cars keeps the
  // rotation continuous. No Bounds/OrbitControls — the camera stays put and the
  // car is size-normalized instead, lit by a plain environment (Stage would
  // re-center the turning car each frame and make it wobble).
  if (spin) {
    return (
      <div className={className}>
        <Canvas
          camera={{ position: [3.2, 1.35, 3.8], fov: 42 }}
          gl={{ alpha: transparent, antialias: true }}
        >
          {transparent ? null : (
            <>
              <color attach="background" args={["#101010"]} />
              <fog attach="fog" args={["#101010", 12, 34]} />
            </>
          )}
          <Environment preset="city" />
          <ambientLight intensity={0.5} />
          <directionalLight position={[6, 8, 5]} intensity={0.9} />
          <SpinCar url={url} paint={paint} speed={spinSpeed} />
        </Canvas>
      </div>
    );
  }

  return (
    <div className={className}>
      <Canvas
        camera={{ position: [5, 2.5, 6], fov: 40 }}
        gl={{ alpha: transparent, antialias: true }}
      >
        {transparent ? null : (
          <>
            <color attach="background" args={["#101010"]} />
            <fog attach="fog" args={["#101010", 12, 34]} />
          </>
        )}
        {/* Stage lights the scene; adjustCamera off so <Bounds> owns framing —
            it fits each differently-sized car uniformly (some sat too low). */}
        <Stage
          environment="city"
          intensity={0.6}
          contactShadow={false}
          adjustCamera={false}
        >
          <Suspense fallback={null}>
            <Bounds key={url} fit clip observe margin={1.15}>
              <Center>
                <Model url={url} paint={paint} />
              </Center>
            </Bounds>
          </Suspense>
        </Stage>
        <OrbitControls
          makeDefault
          autoRotate
          autoRotateSpeed={8}
          enablePan={false}
          maxPolarAngle={Math.PI / 2}
        />
      </Canvas>
    </div>
  );
}

useGLTF.preload(CARS.nissan.file);
RING_CARS.forEach((key) => useGLTF.preload(CARS[key].file));
