/**
 * Team Management Dashboard
 *
 * Manage team members, roles, and API keys for enterprise customers.
 */

'use client'

import { useState } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Users, UserPlus, Trash2, Shield, Eye, Code } from 'lucide-react'

export default function TeamDashboardPage() {
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'admin' | 'developer' | 'viewer'>('developer')
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false)

  const teams = useQuery(api.teams.getUserTeams)
  const members = useQuery(
    api.teams.getTeamMembers,
    selectedTeamId ? { teamId: selectedTeamId as any } : 'skip'
  )

  const inviteMember = useMutation(api.teams.inviteTeamMember)
  const removeMember = useMutation(api.teams.removeTeamMember)

  const handleInviteMember = async () => {
    if (!selectedTeamId || !inviteEmail) {
      toast.error('Please fill in all fields')
      return
    }

    try {
      await inviteMember({
        teamId: selectedTeamId as any,
        email: inviteEmail,
        role: inviteRole,
      })

      toast.success(`Invite sent to ${inviteEmail}`)
      setInviteEmail('')
      setIsInviteDialogOpen(false)
    } catch (error: any) {
      toast.error(error.message || 'Failed to invite member')
    }
  }

  const handleRemoveMember = async (memberId: string) => {
    if (!selectedTeamId) return

    try {
      await removeMember({
        teamId: selectedTeamId as any,
        memberId: memberId as any,
      })

      toast.success('Member removed')
    } catch (error: any) {
      toast.error(error.message || 'Failed to remove member')
    }
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner':
      case 'admin':
        return <Shield className="h-4 w-4" />
      case 'developer':
        return <Code className="h-4 w-4" />
      case 'viewer':
        return <Eye className="h-4 w-4" />
      default:
        return <Users className="h-4 w-4" />
    }
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'owner':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
      case 'admin':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      case 'developer':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'viewer':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    }
  }

  if (!teams) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100" />
      </div>
    )
  }

  const selectedTeam = teams.find(
    (
      t: {
        _id: string
        name: string
        memberCount: number
        maxMembers: number
        plan: string
        role: string
      } | null
    ) => t?._id === selectedTeamId
  )

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Team Management</h1>
        <p className="text-muted-foreground">
          Manage team members, roles, and permissions for your organization.
        </p>
      </div>

      {/* Team Selector */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Select Team</CardTitle>
          <CardDescription>Choose a team to manage</CardDescription>
        </CardHeader>
        <CardContent>
          {teams.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground mb-4">You are not part of any teams yet.</p>
              <Button>Create Team</Button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {teams.map(
                (
                  team: {
                    _id: string
                    name: string
                    memberCount: number
                    plan: string
                    role: string
                  } | null
                ) => {
                  if (!team) return null
                  return (
                    <Card
                      key={team._id}
                      className={`cursor-pointer transition-all ${
                        selectedTeamId === team._id
                          ? 'border-primary ring-2 ring-primary/20'
                          : 'hover:border-primary/50'
                      }`}
                      onClick={() => setSelectedTeamId(team._id)}
                    >
                      <CardHeader>
                        <CardTitle className="text-lg">{team.name}</CardTitle>
                        <CardDescription>
                          {team.memberCount} members • {team.plan}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div
                          className={`inline-flex items-center gap-2 px-2 py-1 rounded text-xs ${getRoleBadgeColor(team.role)}`}
                        >
                          {getRoleIcon(team.role)}
                          <span className="capitalize">{team.role}</span>
                        </div>
                      </CardContent>
                    </Card>
                  )
                }
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Team Members */}
      {selectedTeam && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Team Members</CardTitle>
                <CardDescription>
                  {members?.length || 0} / {selectedTeam.maxMembers} members
                </CardDescription>
              </div>
              <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Invite Member
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Invite Team Member</DialogTitle>
                    <DialogDescription>
                      Send an invitation to join {selectedTeam.name}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <div>
                      <Label htmlFor="email">Email Address</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="colleague@example.com"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="role">Role</Label>
                      <Select value={inviteRole} onValueChange={(v: any) => setInviteRole(v)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin - Full access</SelectItem>
                          <SelectItem value="developer">Developer - Manage API keys</SelectItem>
                          <SelectItem value="viewer">Viewer - Read-only access</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button onClick={handleInviteMember} className="w-full">
                      Send Invitation
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {!members || members.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No team members yet</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((member: any) => (
                    <TableRow key={member._id}>
                      <TableCell className="font-medium">{member.name || 'Anonymous'}</TableCell>
                      <TableCell>
                        {member.email || member.walletAddress?.slice(0, 8) + '...'}
                      </TableCell>
                      <TableCell>
                        <div
                          className={`inline-flex items-center gap-2 px-2 py-1 rounded text-xs ${getRoleBadgeColor(member.role)}`}
                        >
                          {getRoleIcon(member.role)}
                          <span className="capitalize">{member.role}</span>
                        </div>
                      </TableCell>
                      <TableCell>{new Date(member.joinedAt).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        {member.role !== 'owner' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveMember(member._id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
