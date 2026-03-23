'use client';

import { Canvas } from '@react-three/fiber';
import { Text3D, Center } from '@react-three/drei';
import { useMemo } from 'react';

function getYearRotation(year: string): [number, number, number] {
  const rotations: Record<string, [number, number, number]> = {
    '2027': [0.1, -0.2, 0.03],
    '2028': [-0.08, 0.15, -0.04],
    '2029': [0.06, 0.25, 0.02],
    '2030': [-0.1, -0.18, 0.05],
    '2031': [0.12, 0.1, -0.03],
  };
  return rotations[year] || [0, 0.1, 0];
}

const textProps = {
  font: '/fonts/arcadeclassic.typeface.json',
  size: 1.8,
  letterSpacing: 0.08,
} as const;

function ClassText({ year }: { year: string }) {
  const rotation = useMemo(() => getYearRotation(year), [year]);

  return (
    <group rotation={rotation}>
      <Center>
        <Text3D
          {...textProps}
          height={0.5}
          bevelEnabled
          bevelThickness={0.06}
          bevelSize={0.04}
          bevelSegments={3}
        >
          {`CLASS OF ${year}`}
          <meshStandardMaterial
            color="#ffffff"
            metalness={0.3}
            roughness={0.4}
          />
        </Text3D>
      </Center>
    </group>
  );
}

interface ClassTitle3DProps {
  year: string;
}

export default function ClassTitle3D({ year }: ClassTitle3DProps) {
  return (
    <div style={{ width: '100%', height: 200 }}>
      <Canvas
        camera={{ position: [0, 0, 10], fov: 50 }}
        style={{ background: 'transparent' }}
        gl={{ alpha: true }}
      >
        <ambientLight intensity={0.5} />
        <directionalLight position={[5, 5, 5]} intensity={1.2} />
        <directionalLight position={[-3, -2, 4]} intensity={0.4} />
        <ClassText year={year} />
      </Canvas>
    </div>
  );
}
