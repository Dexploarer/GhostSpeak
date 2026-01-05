'use client'

import { useWallet } from '@/lib/wallet/WalletStandardProvider'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Settings, User, Save, ArrowLeft } from 'lucide-react'
import { Footer } from '@/components/layout/Footer'
import { toast } from 'sonner'

export default function SettingsPage() {
  const { publicKey } = useWallet()
  const router = useRouter()
  
  // Form state
  const [username, setUsername] = useState('')
  const [bio, setBio] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // Fetch user data
  const user = useQuery(api.solanaAuth.getUserByWallet, 
    publicKey ? { walletAddress: publicKey } : 'skip'
  )

  const updateUserProfile = useMutation(api.solanaAuth.updateUserProfile)

  // Initialize form with user data
  useEffect(() => {
    if (user) {
      setUsername(user.username || '')
      setBio(user.bio || '')
    }
  }, [user])

  // Redirect if not connected
  useEffect(() => {
    if (!publicKey) {
      router.push('/')
    }
  }, [publicKey, router])

  const handleSave = async () => {
    if (!publicKey) return
    
    setIsLoading(true)
    try {
      await updateUserProfile({
        walletAddress: publicKey,
        username,
        bio,
      })
      toast.success('Profile updated successfully')
    } catch (error) {
      console.error('Failed to update profile:', error)
      toast.error('Failed to update profile')
    } finally {
      setIsLoading(false)
    }
  }

  if (!publicKey) return null

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-12">
        <button 
          onClick={() => router.back()}
          className="flex items-center gap-2 text-white/40 hover:text-white mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <div className="flex items-center gap-4 mb-8">
          <div className="p-3 bg-white/5 rounded-xl">
            <Settings className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-light text-white">Settings</h1>
            <p className="text-white/40">Manage your profile and preferences</p>
          </div>
        </div>

        <div className="bg-[#111111] border border-white/10 rounded-xl p-6 md:p-8 space-y-8">
          
          {/* Public Profile */}
          <section>
            <h2 className="text-lg font-light text-white mb-6 flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              Public Profile
            </h2>
            
            <div className="space-y-6 max-w-xl">
              <div className="space-y-2">
                <label className="text-sm text-white/60">Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username"
                  className="w-full px-4 py-2.5 bg-black/40 border border-white/10 rounded-lg text-white focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm text-white/60">Bio</label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell us about yourself..."
                  rows={4}
                  className="w-full px-4 py-2.5 bg-black/40 border border-white/10 rounded-lg text-white focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all resize-none"
                />
              </div>

              <button
                onClick={handleSave}
                disabled={isLoading}
                className="flex items-center gap-2 px-6 py-2.5 bg-primary text-black font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {isLoading ? (
                  <span className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Save Changes
              </button>
            </div>
          </section>
        </div>
      </div>
      <Footer />
    </div>
  )
}
