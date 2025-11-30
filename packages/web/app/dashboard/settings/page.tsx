'use client'

import React from 'react'
import { GlassCard } from '@/components/dashboard/shared/GlassCard'
import { Settings, Moon, Bell, Shield } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">Settings</h1>
          <p className="text-gray-400">Manage your dashboard preferences</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
         <GlassCard className="p-6 space-y-6">
            <div className="flex items-center gap-3 mb-6 border-b border-white/10 pb-4">
               <Settings className="w-5 h-5 text-purple-400" />
               <h2 className="font-semibold text-white">General</h2>
            </div>
            
            <div className="flex items-center justify-between">
               <div className="flex items-center gap-3">
                  <Moon className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-300">Dark Mode</span>
               </div>
               <Switch checked={true} />
            </div>
            
            <div className="flex items-center justify-between">
               <div className="flex items-center gap-3">
                  <Bell className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-300">Notifications</span>
               </div>
               <Switch checked={true} />
            </div>
         </GlassCard>

         <GlassCard className="p-6 space-y-6">
            <div className="flex items-center gap-3 mb-6 border-b border-white/10 pb-4">
               <Shield className="w-5 h-5 text-cyan-400" />
               <h2 className="font-semibold text-white">Security</h2>
            </div>
            
            <div className="space-y-4">
               <div className="flex justify-between items-center">
                  <span className="text-gray-300">Wallet Auto-Connect</span>
                  <Switch />
               </div>
               <Button variant="outline" className="w-full border-red-500/30 text-red-400 hover:bg-red-500/10">
                  Disconnect All Sessions
               </Button>
            </div>
         </GlassCard>
      </div>
    </div>
  )
}
