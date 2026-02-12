import { useMemo, useRef, useState, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Mesh } from "three";
import * as THREE from "three";

const LiquidPlane = ({ reduced }: { reduced: boolean }) => {
  const mesh = useRef<Mesh>(null);
  const { size } = useThree();
  const [pointer, setPointer] = useState<[number, number]>([0, 0]);

  useEffect(() => {
    const handle = (event: MouseEvent) => {
      setPointer([event.clientX / size.width, event.clientY / size.height]);
    };
    window.addEventListener("mousemove", handle);
    return () => window.removeEventListener("mousemove", handle);
  }, [size.height, size.width]);

  useFrame(({ clock }) => {
    if (!mesh.current || reduced) return;
    const time = clock.getElapsedTime();
    mesh.current.rotation.z = Math.sin(time * 0.3) * 0.02;
    const position = pointer;
    if (mesh.current.material instanceof THREE.MeshStandardMaterial) {
      mesh.current.material.emissiveIntensity = 0.4 + Math.sin(time) * 0.1;
      mesh.current.material.color = new THREE.Color(
        0x0d1f2d
      ).lerp(new THREE.Color(0x34d399), (position[0] + position[1]) / 2);
    }
    mesh.current.position.y = Math.sin(time * 0.7) * 0.6;
  });

  const geometry = useMemo(() => new THREE.PlaneGeometry(6, 6, 60, 60), []);

  return (
    <mesh ref={mesh} geometry={geometry} rotation={[-Math.PI / 2, 0, 0]} position={[0, -1, 0]}>
      <meshStandardMaterial
        attach="material"
        color="#0f172a"
        metalness={0.7}
        roughness={0.15}
        emissive="#0fbb9c"
        emissiveIntensity={0.4}
        transparent
        opacity={0.9}
      />
    </mesh>
  );
};

export default function Hero3D() {
  const [visible, setVisible] = useState(false);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    setVisible(true);
  }, []);

  if (!visible || typeof window === "undefined" || !(window as any).WebGLRenderingContext) {
    return (
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-[#051125] via-[#030615] to-[#020617]">
        <div className="absolute inset-0 opacity-40 bg-noise" />
      </div>
    );
  }

  return (
    <div className="absolute inset-0 -z-10">
      <Canvas
        className="h-full w-full"
        shadows={false}
        dpr={[1, 1.5]}
        onCreated={({ gl }) => {
          gl.setClearColor("#020617");
        }}
      >
        <ambientLight intensity={0.4} />
        <directionalLight position={[1, 2, 3]} intensity={1.2} />
        <LiquidPlane reduced={reduced} />
      </Canvas>
    </div>
  );
}
