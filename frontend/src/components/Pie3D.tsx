import React, { useMemo, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { useReducedMotion } from "framer-motion";

type Slice = { label: string; value: number; color: string };

const ACCENTS = ["#5EE7FF", "#4C7DFF", "#FF4FD8", "#8B5CFF"];

function SliceMesh({
  startAngle,
  angle,
  height,
  color,
  active,
  onHover,
  onSelect,
  reduceMotion,
}: {
  startAngle: number;
  angle: number;
  height: number;
  color: string;
  active: boolean;
  onHover: (v: boolean) => void;
  onSelect: () => void;
  reduceMotion: boolean;
}) {
  const radius = 1.4;
  const geometry = useMemo(
    () =>
      new THREE.CylinderGeometry(
        radius,
        radius,
        height,
        32,
        1,
        false,
        startAngle,
        angle
      ),
    [startAngle, angle, height]
  );

  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color,
        roughness: 0.4,
        metalness: 0.1,
        emissive: new THREE.Color(color),
        emissiveIntensity: active ? 0.35 : 0.12,
      }),
    [color, active]
  );

  const offset = active ? 0.08 : 0;
  const mid = startAngle + angle / 2;
  const x = Math.cos(mid) * offset;
  const z = Math.sin(mid) * offset;

  return (
    <mesh
      geometry={geometry}
      material={material}
      position={[x, 0, z]}
      onPointerOver={() => onHover(true)}
      onPointerOut={() => onHover(false)}
      onClick={onSelect}
    />
  );
}

function PieScene({
  slices,
  reduceMotion,
  onSelect,
  selected,
}: {
  slices: Slice[];
  reduceMotion: boolean;
  onSelect: (label: string) => void;
  selected: string | null;
}) {
  const [hover, setHover] = useState<string | null>(null);
  const groupRef = React.useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (reduceMotion || !groupRef.current) return;
    groupRef.current.rotation.y += delta * 0.2;
  });

  const total = slices.reduce((acc, s) => acc + s.value, 0) || 1;
  let accAngle = 0;
  return (
    <group ref={groupRef} rotation={[0.7, 0, 0]}>
      {slices.map((s) => {
        const angle = (s.value / total) * Math.PI * 2;
        const start = accAngle;
        accAngle += angle;
        const isActive = selected === s.label || hover === s.label;
        return (
          <SliceMesh
            key={s.label}
            startAngle={start}
            angle={angle}
            height={0.5}
            color={s.color}
            active={isActive}
            onHover={(v) => setHover(v ? s.label : null)}
            onSelect={() => onSelect(s.label)}
            reduceMotion={reduceMotion}
          />
        );
      })}
    </group>
  );
}

export default function Pie3D({
  values,
}: {
  values: { label: string; value: number }[];
}) {
  const reduceMotion = useReducedMotion();
  const slices: Slice[] = values.map((v, i) => ({
    ...v,
    color: ACCENTS[i % ACCENTS.length],
  }));
  const [selected, setSelected] = useState<string | null>(slices[0]?.label || null);
  const total = slices.reduce((acc, s) => acc + s.value, 0) || 1;
  const selectedSlice = slices.find((s) => s.label === selected);

  return (
    <div>
      <div className="h-[240px] w-full">
        <Canvas camera={{ position: [0, 2.4, 3.2], fov: 40 }} dpr={[1, 1.5]}>
          <ambientLight intensity={0.4} />
          <directionalLight position={[2, 3, 2]} intensity={0.7} />
          <PieScene
            slices={slices}
            reduceMotion={!!reduceMotion}
            onSelect={setSelected}
            selected={selected}
          />
          <OrbitControls
            enableZoom={false}
            enablePan={false}
            autoRotate={false}
            maxPolarAngle={Math.PI / 2}
            minPolarAngle={Math.PI / 2.5}
          />
        </Canvas>
      </div>
      <div className="mt-3 text-xs text-white/70">
        {selectedSlice && (
          <span>
            {selectedSlice.label} {Math.round((selectedSlice.value / total) * 100)}%
          </span>
        )}
      </div>
      <div className="mt-2 grid grid-cols-3 gap-2 text-[11px] text-white/60">
        {slices.map((s) => (
          <div key={s.label} className="flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full" style={{ background: s.color }} />
            <span>{s.label}</span>
            <span>{Math.round((s.value / total) * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
