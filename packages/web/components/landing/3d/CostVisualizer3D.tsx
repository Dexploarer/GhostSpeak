'use client'

import React, { useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Float, Environment } from '@react-three/drei'
import * as THREE from 'three'

function ComparisonScene() {
  const groupRef = useRef<THREE.Group>(null)

  // Standard Agent - One big, heavy, clunky block
  const standardRef = useRef<THREE.Mesh>(null)

  // GhostSpeak Swarm - 100 particles representing the 5000x efficiency
  const swarmRef = useRef<THREE.InstancedMesh>(null)
  const swarmCount = 150
  const dummy = useMemo(() => new THREE.Object3D(), [])

  const particles = useMemo(() => {
    const temp = []
    for (let i = 0; i < swarmCount; i++) {
      const x = (Math.random() - 0.5) * 3 + 2.5 // Shifted right but closer
      const y = (Math.random() - 0.5) * 3
      const z = (Math.random() - 0.5) * 3
      temp.push({
        pos: new THREE.Vector3(x, y, z),
        phase: Math.random() * Math.PI * 2,
        speed: 0.5 + Math.random(),
      })
    }
    return temp
  }, [])

  useFrame((state) => {
    const t = state.clock.getElapsedTime()

    // Animate Standard Block
    if (standardRef.current) {
      standardRef.current.rotation.y = t * 0.2
      standardRef.current.rotation.x = t * 0.1
    }

    // Animate Swarm
    if (swarmRef.current) {
      particles.forEach((p, i) => {
        const s = 0.04 + Math.sin(t * p.speed + p.phase) * 0.015
        dummy.position.set(
          p.pos.x + Math.sin(t * 0.8 + p.phase) * 0.3,
          p.pos.y + Math.cos(t * 0.5 + p.phase) * 0.3,
          p.pos.z + Math.sin(t * 0.3 + p.phase) * 0.2
        )
        dummy.scale.set(s, s, s)
        dummy.rotation.set(t * 0.2, t * 0.3, 0)
        dummy.updateMatrix()
        swarmRef.current!.setMatrixAt(i, dummy.matrix)
      })
      swarmRef.current.instanceMatrix.needsUpdate = true
    }

    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(t * 0.05) * 0.05
    }
  })

  return (
    <group ref={groupRef}>
      {/* Standard Side */}
      <Float speed={1.5} rotationIntensity={0.5} floatIntensity={0.5}>
        <group position={[-2.5, 0, 0]}>
          <mesh ref={standardRef}>
            <boxGeometry args={[2.5, 2.5, 2.5]} />
            <meshStandardMaterial
              color="#111"
              metalness={0.9}
              roughness={0.1}
              emissive="#ffffff"
              emissiveIntensity={0.01}
            />
          </mesh>
        </group>
      </Float>

      {/* GhostSpeak Side */}
      <Float speed={2} rotationIntensity={0.2} floatIntensity={0.2}>
        <group position={[0, 0, 0]}>
          <instancedMesh ref={swarmRef} args={[undefined, undefined, swarmCount]}>
            <boxGeometry args={[1, 1, 1]} />
            <meshBasicMaterial color="#ccff00" toneMapped={false} />
          </instancedMesh>
        </group>
      </Float>
    </group>
  )
}

export function CostVisualizer3D() {
  return (
    <div className="w-full h-full min-h-[400px] relative">
      <Canvas gl={{ antialias: true, alpha: true }} camera={{ position: [0, 0, 10], fov: 45 }}>
        <ambientLight intensity={0.2} />
        <pointLight position={[10, 10, 10]} intensity={1} color="#ccff00" />
        <spotLight position={[-10, 10, 10]} angle={0.15} penumbra={1} intensity={2} />

        <ComparisonScene />

        <Environment preset="night" />
      </Canvas>
    </div>
  )
}
