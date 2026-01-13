'use client'

import React, { useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import {
  Float,
  MeshDistortMaterial,
  MeshWobbleMaterial,
  Environment,
  Points,
  PointMaterial,
} from '@react-three/drei'
import * as THREE from 'three'

function NeuralNetwork() {
  const pointsRef = useRef<THREE.Points>(null)

  const count = 1000
  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      const r = 2 + Math.random() * 2
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
      pos[i * 3 + 2] = r * Math.cos(phi)
    }
    return pos
  }, [])

  useFrame((state) => {
    if (!pointsRef.current) return
    pointsRef.current.rotation.y = state.clock.getElapsedTime() * 0.1
    pointsRef.current.rotation.z = state.clock.getElapsedTime() * 0.05
  })

  return (
    <Points ref={pointsRef} positions={positions} stride={3}>
      <PointMaterial
        transparent
        color="#ccff00"
        size={0.02}
        sizeAttenuation={true}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </Points>
  )
}

function DataRings() {
  const groupRef = useRef<THREE.Group>(null)

  useFrame((state) => {
    if (!groupRef.current) return
    const t = state.clock.getElapsedTime()
    groupRef.current.children.forEach((child: any, i: number) => {
      child.rotation.x = t * (0.2 + i * 0.1)
      child.rotation.y = t * (0.1 + i * 0.05)
    })
  })

  return (
    <group ref={groupRef}>
      {[...Array(3)].map((_: any, i: number) => (
        <mesh key={i} rotation={[Math.random() * Math.PI, Math.random() * Math.PI, 0]}>
          <torusGeometry args={[2 + i * 0.5, 0.01, 16, 100]} />
          <meshBasicMaterial color="#ccff00" transparent opacity={0.2} />
        </mesh>
      ))}
    </group>
  )
}

function CentralVoid() {
  const meshRef = useRef<THREE.Mesh>(null)
  const outerRef = useRef<THREE.Mesh>(null)

  useFrame((state) => {
    const t = state.clock.getElapsedTime()
    if (meshRef.current) {
      meshRef.current.scale.setScalar(1 + Math.sin(t * 2) * 0.05)
      meshRef.current.rotation.y = t * 0.5
    }
    if (outerRef.current) {
      outerRef.current.rotation.y = -t * 0.3
      outerRef.current.rotation.z = t * 0.2
    }
  })

  return (
    <group>
      {/* The "Ghost" Core - A refractive, distorting dark mass */}
      <mesh ref={meshRef}>
        <sphereGeometry args={[1.5, 64, 64]} />
        <MeshDistortMaterial
          color="#050505"
          speed={3}
          distort={0.5}
          roughness={0}
          metalness={1}
          envMapIntensity={2}
        />
      </mesh>

      {/* Internal Energy Glow */}
      <mesh>
        <sphereGeometry args={[1.4, 32, 32]} />
        <meshBasicMaterial color="#ccff00" transparent opacity={0.1} wireframe />
      </mesh>

      {/* Outer Glitch Shell */}
      <mesh ref={outerRef}>
        <sphereGeometry args={[1.8, 64, 64]} />
        <MeshWobbleMaterial
          color="#ccff00"
          speed={5}
          factor={0.4}
          transparent
          opacity={0.05}
          wireframe
        />
      </mesh>
    </group>
  )
}

export function GhostMascot3D() {
  return (
    <div className="w-full h-full min-h-[500px] relative">
      <Canvas gl={{ antialias: true, alpha: true }} camera={{ position: [0, 0, 10], fov: 45 }}>
        <ambientLight intensity={0.1} />
        <pointLight position={[10, 10, 10]} intensity={1.5} color="#ccff00" />
        <spotLight
          position={[-10, 10, 10]}
          angle={0.15}
          penumbra={1}
          intensity={2}
          color="#ccff00"
        />

        <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
          <CentralVoid />
          <NeuralNetwork />
          <DataRings />
        </Float>

        <Environment preset="night" />
      </Canvas>
    </div>
  )
}
