'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { GhostIcon } from '../shared/GhostIcon'

export function ProtocolVisualizer() {
  return (
    <div className="relative w-full h-[600px] flex items-center justify-center overflow-hidden bg-black/50 rounded-3xl border border-white/5 backdrop-blur-3xl shadow-2xl">
      {/* Background Grid */}
      <div className="absolute inset-0 holographic-grid opacity-20" />
      
      {/* Central x402 Settlement Layer */}
      <div className="relative z-10 w-96 h-96 flex items-center justify-center">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0 border-2 border-primary/20 rounded-full border-dashed"
        />
        <motion.div 
          animate={{ rotate: -360 }}
          transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
          className="absolute inset-4 border border-primary/10 rounded-full"
        />
        
        {/* The "Core" */}
        <div className="relative w-64 h-64 rounded-full bg-linear-to-br from-primary/20 to-transparent flex items-center justify-center backdrop-blur-2xl border border-primary/30 shadow-[0_0_50px_rgba(204,255,0,0.2)]">
          <div className="text-center">
            <div className="text-4xl font-black text-primary mb-1 tracking-tighter">x402</div>
            <div className="text-[10px] font-mono text-primary/60 tracking-[0.2em] uppercase">Settlement Layer</div>
          </div>
          
          {/* Pulsing Energy */}
          <motion.div 
            animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.3, 0.1] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="absolute inset-0 bg-primary rounded-full blur-3xl -z-10"
          />
        </div>
      </div>

      {/* Floating Agents (Ghost Icons) */}
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0 }}
          animate={{ 
            opacity: [0.4, 0.8, 0.4],
            x: [
              Math.sin(i * 60) * 300, 
              Math.sin(i * 60 + 1) * 350, 
              Math.sin(i * 60) * 300
            ],
            y: [
              Math.cos(i * 60) * 300, 
              Math.cos(i * 60 + 1) * 250, 
              Math.cos(i * 60) * 300
            ],
            scale: [1, 1.1, 1]
          }}
          transition={{ 
            duration: 10 + i * 2, 
            repeat: Infinity, 
            ease: "easeInOut" 
          }}
          className="absolute z-20"
        >
          <div className="relative group cursor-pointer">
            <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full scale-150 opacity-0 group-hover:opacity-100 transition-opacity" />
            <GhostIcon 
              variant={i % 2 === 0 ? 'circuit' : 'brain'} 
              size={60} 
              className="text-primary/70 group-hover:text-primary transition-colors" 
            />
            {/* Connection Line to Core */}
            <svg className="absolute top-1/2 left-1/2 -z-10 overflow-visible">
               <motion.line 
                 x1="0" y1="0" 
                 x2={-Math.sin(i * 60) * 200} 
                 y2={-Math.cos(i * 60) * 200}
                 stroke="currentColor" 
                 strokeWidth="0.5" 
                 className="text-primary/20"
                 strokeDasharray="4 4"
                 animate={{ strokeDashoffset: [0, -20] }}
                 transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
               />
            </svg>
          </div>
        </motion.div>
      ))}

      {/* Volumetric Rays */}
      <div className="absolute top-0 left-1/4 w-px h-full bg-linear-to-b from-transparent via-primary/20 to-transparent -rotate-12 blur-[1px]" />
      <div className="absolute top-0 right-1/4 w-px h-full bg-linear-to-b from-transparent via-primary/20 to-transparent rotate-12 blur-[1px]" />
    </div>
  )
}
