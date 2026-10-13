import { Canvas } from '@react-three/fiber'
import { Environment, OrbitControls, PerspectiveCamera } from '@react-three/drei'
import { Suspense, useMemo } from 'react'
import { HallModel } from './Hall/HallModel'
import { useConfigStore } from '../store/configStore'

function CameraRig() {
  const { length, width, wallHeight } = useConfigStore()
  const dist = Math.max(length, width) * 0.95 + wallHeight * 1.4
  const position = useMemo(
    () => [dist * 0.7, dist * 0.42, dist * 0.8] as [number, number, number],
    [dist],
  )
  return (
    <PerspectiveCamera makeDefault position={position} fov={40} near={1} far={300} />
  )
}

export function Scene() {
  return (
    <Canvas
      shadows
      dpr={[1, 1.5]}
      className="scene-canvas"
      gl={{
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance',
        toneMappingExposure: 1.05,
      }}
      onCreated={({ gl }) => {
        gl.setClearColor('#ffffff')
      }}
    >
      <color attach="background" args={['#ffffff']} />

      <CameraRig />
      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.08}
        minPolarAngle={0.25}
        maxPolarAngle={Math.PI / 2 - 0.12}
        minDistance={12}
        maxDistance={140}
        target={[0, 4, 0]}
      />

      <ambientLight intensity={0.85} />
      <hemisphereLight args={['#ffffff', '#e8dcc8', 0.65]} />
      <directionalLight
        castShadow
        position={[35, 45, 25]}
        intensity={1.25}
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.00025}
        shadow-normalBias={0.05}
        shadow-camera-far={150}
        shadow-camera-left={-60}
        shadow-camera-right={60}
        shadow-camera-top={60}
        shadow-camera-bottom={-60}
      />
      <directionalLight position={[-20, 16, -12]} intensity={0.4} color="#c87f50" />
      {/* Interior light so plants read through glass */}
      <pointLight position={[0, 4.5, 0]} intensity={1.1} color="#fff8ee" distance={55} />
      <pointLight position={[4, 3, 6]} intensity={0.55} color="#ffe8c8" distance={30} />

      <Suspense fallback={null}>
        <Environment preset="warehouse" environmentIntensity={0.7} />
        <HallModel />
      </Suspense>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.28, 0]} receiveShadow>
        <planeGeometry args={[220, 220]} />
        <meshStandardMaterial color="#ffffff" roughness={1} metalness={0} />
      </mesh>
    </Canvas>
  )
}
