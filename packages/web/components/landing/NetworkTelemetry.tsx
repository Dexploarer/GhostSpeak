'use client'

import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Activity, Cpu, Globe, Zap } from 'lucide-react'

export function NetworkTelemetry() {
  const [tps, setTps] = useState(2450)
  const [latency, setLatency] = useState(38)
  const [nodes, setNodes] = useState(1842)

  useEffect(() => {
    const interval = setInterval(() => {
      setTps(prev => prev + Math.floor(Math.random() * 50) - 25)
      setLatency(prev => Math.max(32, Math.min(48, prev + Math.floor(Math.random() * 4) - 2)))
    }, 2000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto px-4 py-24">
      <StatCard 
        icon={<Zap className="w-5 h-5 text-primary" />}
        label="Global Throughput"
        value={`${tps.toLocaleString()} TPS`}
        subValue="+12% vs last hour"
        chartColor="bg-primary"
      />
      <StatCard 
        icon={<Activity className="w-5 h-5 text-primary" />}
        label="Avg. Finality"
        value={`${latency}ms`}
        subValue="Optimized via x402"
        chartColor="bg-primary/60"
      />
      <StatCard 
        icon={<Globe className="w-5 h-5 text-primary" />}
        label="Active Nodes"
        value={nodes.toLocaleString()}
        subValue="Decentralized Network"
        chartColor="bg-primary/40"
      />
      <StatCard 
        icon={<Cpu className="w-5 h-5 text-primary" />}
        label="Agent Capacity"
        value="10M+"
        subValue="Elastic Scaling"
        chartColor="bg-primary/80"
      />
    </div>
  )
}

function StatCard({ icon, label, value, subValue, chartColor }: { 
  icon: React.ReactNode, 
  label: string, 
  value: string, 
  subValue: string,
  chartColor: string 
}) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="group relative overflow-hidden rounded-2xl bg-card/40 border border-border p-6 backdrop-blur-xl hover:border-primary/30 transition-all duration-500"
    >
      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
        {icon}
      </div>
      
      <div className="space-y-4">
        <div>
          <div className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-1">{label}</div>
          <div className="text-3xl font-black text-foreground tracking-tighter">{value}</div>
        </div>
        
        <div className="flex items-end gap-1 h-8">
           {[...Array(12)].map((_, i) => (
             <motion.div 
               key={i}
               initial={{ height: "20%" }}
               animate={{ height: [`${20 + Math.random() * 60}%`, `${30 + Math.random() * 70}%`, `${20 + Math.random() * 60}%`] }}
               transition={{ duration: 2 + Math.random() * 2, repeat: Infinity, ease: "easeInOut" }}
               className={`w-1 rounded-t-full ${chartColor}`}
             />
           ))}
        </div>
        
        <div className="text-[10px] font-mono text-primary/70">{subValue}</div>
      </div>
      
      {/* Laser Border Effect */}
      <div className="absolute bottom-0 left-0 h-px bg-linear-to-r from-transparent via-primary to-transparent w-full opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
    </motion.div>
  )
}
