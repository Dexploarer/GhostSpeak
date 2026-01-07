'use client'

import { useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, PerspectiveCamera, Float, Stars } from '@react-three/drei'
import * as THREE from 'three'

const COUNT = 800
const CONNECTION_DISTANCE = 2.5

function Swarm() {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const linesRef = useRef<THREE.LineSegments>(null)

  // Particle State
  const particles = useMemo(() => {
    const temp = []
    for (let i = 0; i < COUNT; i++) {
      const x = (Math.random() - 0.5) * 25 // Widened spread
      const y = (Math.random() - 0.5) * 25
      const z = (Math.random() - 0.5) * 15
      temp.push({
        pos: new THREE.Vector3(x, y, z),
        vel: new THREE.Vector3(
          (Math.random() - 0.5) * 0.02,
          (Math.random() - 0.5) * 0.02,
          (Math.random() - 0.5) * 0.02
        ),
      })
    }
    return temp
  }, [])

  // Line State
  const lineGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry()
    // Max possible lines is somewhat arbitrary for perf, let's allow decent amount
    const maxConnections = COUNT * 2
    const positions = new Float32Array(maxConnections * 3 * 2) // 2 points per line, 3 coords per point
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    return geometry
  }, [])

  const lineMaterial = useMemo(() => {
    return new THREE.LineBasicMaterial({
      color: new THREE.Color('#ccff00'),
      transparent: true,
      opacity: 0.15,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  }, [])

  const dummy = useMemo(() => new THREE.Object3D(), [])

  useFrame((state) => {
    if (!meshRef.current || !linesRef.current) return

    // Update Particles
    particles.forEach((particle, i) => {
      // Move
      particle.pos.add(particle.vel)

      // Boundary bounce (soft)
      if (Math.abs(particle.pos.x) > 8) particle.vel.x *= -1
      if (Math.abs(particle.pos.y) > 8) particle.vel.y *= -1
      if (Math.abs(particle.pos.z) > 5) particle.vel.z *= -1

      // Update Instance Matrix
      dummy.position.copy(particle.pos)
      // Pulse size slightly based on time
      const s = 0.1 + Math.sin(state.clock.elapsedTime * 2 + i) * 0.03
      dummy.scale.set(s, s, s)
      dummy.updateMatrix()
      if (meshRef.current) {
        meshRef.current.setMatrixAt(i, dummy.matrix)
      }
    })
    meshRef.current.instanceMatrix.needsUpdate = true

    // Update Connections (Lines)
    const positions = (linesRef.current.geometry.attributes.position as THREE.BufferAttribute)
      .array as Float32Array
    let lineIndex = 0

    // O(N^2) naive check but fine for N=200
    for (let i = 0; i < COUNT; i++) {
      for (let j = i + 1; j < COUNT; j++) {
        const dist = particles[i].pos.distanceTo(particles[j].pos)
        if (dist < CONNECTION_DISTANCE) {
          // Add line
          positions[lineIndex * 6 + 0] = particles[i].pos.x
          positions[lineIndex * 6 + 1] = particles[i].pos.y
          positions[lineIndex * 6 + 2] = particles[i].pos.z

          positions[lineIndex * 6 + 3] = particles[j].pos.x
          positions[lineIndex * 6 + 4] = particles[j].pos.y
          positions[lineIndex * 6 + 5] = particles[j].pos.z

          lineIndex++
        }
      }
    }

    // Zero out remaining lines
    for (let k = lineIndex * 6; k < positions.length; k++) {
      positions[k] = 0
    }

    linesRef.current.geometry.setDrawRange(0, lineIndex * 2)
    linesRef.current.geometry.attributes.position.needsUpdate = true
  })

  return (
    <>
      <instancedMesh ref={meshRef} args={[undefined, undefined, COUNT]}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshBasicMaterial color="#ccff00" toneMapped={false} />
      </instancedMesh>
      <lineSegments ref={linesRef} geometry={lineGeometry} material={lineMaterial} />
    </>
  )
}

export function AgentSwarm3D() {
  return (
    <div className="w-full h-full min-h-[600px] relative">
      <Canvas
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
        style={{ pointerEvents: 'none' }} // Pass through clicks if needed, or remove for interactive
      >
        <PerspectiveCamera makeDefault position={[0, 0, 15]} fov={50} />

        {/* Environment */}
        <color attach="background" args={['#050505']} />
        {/* We actually want transparent background to blend with page, so maybe no color? 
            Let's keep it transparent for now by NOT setting background color, 
            or matching the page background if we want a solid scene.
            Given the request, a transparent canvas over the 'void' sounds cooler.
        */}

        <ambientLight intensity={0.5} />
        <Float speed={2} rotationIntensity={0.5} floatIntensity={0.2}>
          <Swarm />
        </Float>

        <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />

        <OrbitControls
          enableZoom={false}
          enablePan={false}
          autoRotate
          autoRotateSpeed={0.5}
          maxPolarAngle={Math.PI / 2}
          minPolarAngle={Math.PI / 3}
        />

        {/* Post-processing Bloom could go here, but avoiding EffectComposer for simplicity/perf unless requested */}
      </Canvas>

      {/* Overlay Text/UI passed via children or positioned absolutely */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-full h-full bg-radial-gradient from-transparent to-black/80 pointer-events-none" />
      </div>
    </div>
  )
}
