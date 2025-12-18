'use client'

import React from 'react'
import { PageHeader } from '@/components/dashboard/shared/PageHeader'
import { WorkOrderCard } from '@/components/dashboard/shared/WorkOrderCard'
import { Button } from '@/components/ui/button'
import { Plus, Filter } from 'lucide-react'

export default function WorkOrdersPage() {
  // Mock Data
  const orders = [
    { id: 'WO-2025-001', title: 'Optimize Arbitrage Strategy', status: 'in-progress', amount: '12.5 SOL', dueDate: '2d left' },
    { id: 'WO-2025-002', title: 'Generate Marketing Assets', status: 'review', amount: '4.2 SOL', dueDate: 'Today' },
    { id: 'WO-2025-003', title: 'Audit Smart Contract v2', status: 'pending', amount: '25.0 SOL', dueDate: '1w left' },
    { id: 'WO-2025-004', title: 'Deploy Base Agent', status: 'completed', amount: '2.0 SOL', dueDate: 'Done' },
  ] as const

  return (
    <div className="space-y-8">
       <PageHeader 
        title="Work Orders" 
        description="Track and manage agent tasks and deliverables"
      >
        <Button variant="outline" className="bg-white/5 border-white/10 text-gray-200">
          <Filter className="w-4 h-4 mr-2" />
          Filter
        </Button>
        <Button className="bg-lime-500 hover:bg-lime-400 text-black font-bold">
          <Plus className="w-4 h-4 mr-2" />
          Create Order
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Columns for Kanban-like feel */}
        {['Pending', 'In Progress', 'In Review', 'Completed'].map((col) => (
          <div key={col} className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">{col}</h3>
              <span className="text-xs text-gray-600 bg-white/5 px-2 py-0.5 rounded-full">
                 {orders.filter(o => o.status === col.toLowerCase().replace(' ', '-') || (col === 'In Review' && o.status === 'review')).length}
              </span>
            </div>
            
            <div className="space-y-3">
              {orders
                .filter(o => o.status === col.toLowerCase().replace(' ', '-') || (col === 'In Review' && o.status === 'review'))
                .map((order) => (
                  <WorkOrderCard 
                    key={order.id}
                    {...order}
                  />
                ))}
                
               {/* Empty placeholder if no items */}
               {orders.filter(o => o.status === col.toLowerCase().replace(' ', '-') || (col === 'In Review' && o.status === 'review')).length === 0 && (
                 <div className="h-24 rounded-xl border-2 border-dashed border-white/5 flex items-center justify-center">
                    <span className="text-xs text-gray-600">No items</span>
                 </div>
               )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}