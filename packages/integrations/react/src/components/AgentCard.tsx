/**
 * Agent Card Component
 * 
 * Displays agent information in a card format with actions.
 */

import React from 'react';
import { Agent } from '@ghostspeak/sdk';

export interface AgentCardProps {
  /** Agent data */
  agent: Agent;
  /** Show detailed information */
  detailed?: boolean;
  /** Show action buttons */
  showActions?: boolean;
  /** Custom actions */
  actions?: React.ReactNode;
  /** Click handler */
  onClick?: (agent: Agent) => void;
  /** Message handler */
  onMessage?: (agent: Agent) => void;
  /** Hire handler */
  onHire?: (agent: Agent) => void;
  /** Custom CSS classes */
  className?: string;
  /** Custom styles */
  style?: React.CSSProperties;
}

export function AgentCard({
  agent,
  detailed = false,
  showActions = true,
  actions,
  onClick,
  onMessage,
  onHire,
  className = '',
  style
}: AgentCardProps) {
  const handleCardClick = () => {
    onClick?.(agent);
  };

  const handleMessage = (e: React.MouseEvent) => {
    e.stopPropagation();
    onMessage?.(agent);
  };

  const handleHire = (e: React.MouseEvent) => {
    e.stopPropagation();
    onHire?.(agent);
  };

  return (
    <div
      className={`ghostspeak-agent-card ${className}`}
      style={{
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        padding: '16px',
        backgroundColor: '#ffffff',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'box-shadow 0.2s ease-in-out',
        ...style
      }}
      onClick={handleCardClick}
      onMouseEnter={(e) => {
        if (onClick) {
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
        }
      }}
      onMouseLeave={(e) => {
        if (onClick) {
          e.currentTarget.style.boxShadow = 'none';
        }
      }}
    >
      {/* Header */}
      <div className="agent-header" style={{ 
        display: 'flex', 
        alignItems: 'center', 
        marginBottom: '12px' 
      }}>
        {/* Avatar */}
        <div
          className="agent-avatar"
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '24px',
            backgroundColor: agent.verified ? '#10b981' : '#6b7280',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: 'bold',
            fontSize: '18px',
            marginRight: '12px'
          }}
        >
          {agent.name.charAt(0).toUpperCase()}
        </div>

        {/* Name and status */}
        <div style={{ flex: 1 }}>
          <div style={{ 
            fontSize: '18px', 
            fontWeight: 'bold', 
            marginBottom: '4px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            {agent.name}
            {agent.verified && (
              <span
                style={{
                  backgroundColor: '#10b981',
                  color: 'white',
                  fontSize: '12px',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  fontWeight: 'normal'
                }}
              >
                Verified
              </span>
            )}
            <StatusIndicator status={agent.status} />
          </div>
          <div style={{ 
            fontSize: '14px', 
            color: '#6b7280',
            textTransform: 'capitalize'
          }}>
            {agent.type}
          </div>
        </div>

        {/* Reputation score */}
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '14px', color: '#6b7280' }}>
            Reputation
          </div>
          <div style={{ 
            fontSize: '18px', 
            fontWeight: 'bold',
            color: agent.reputationScore >= 8 ? '#10b981' : 
                   agent.reputationScore >= 6 ? '#f59e0b' : '#ef4444'
          }}>
            {agent.reputationScore.toFixed(1)}
          </div>
        </div>
      </div>

      {/* Description */}
      {agent.description && (
        <div style={{ 
          fontSize: '14px', 
          color: '#374151', 
          marginBottom: '12px',
          lineHeight: '1.5'
        }}>
          {detailed ? agent.description : 
           agent.description.length > 100 ? 
           `${agent.description.substring(0, 100)}...` : 
           agent.description}
        </div>
      )}

      {/* Capabilities */}
      {agent.capabilities && agent.capabilities.length > 0 && (
        <div style={{ marginBottom: '12px' }}>
          <div style={{ 
            fontSize: '12px', 
            color: '#6b7280', 
            marginBottom: '6px' 
          }}>
            Capabilities
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
            {agent.capabilities.slice(0, detailed ? undefined : 3).map((capability, index) => (
              <span
                key={index}
                style={{
                  backgroundColor: '#f3f4f6',
                  color: '#374151',
                  fontSize: '12px',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  border: '1px solid #e5e7eb'
                }}
              >
                {capability}
              </span>
            ))}
            {!detailed && agent.capabilities.length > 3 && (
              <span style={{ fontSize: '12px', color: '#6b7280' }}>
                +{agent.capabilities.length - 3} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* Detailed information */}
      {detailed && (
        <div style={{ marginBottom: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '14px', color: '#6b7280' }}>
              Total Jobs: {agent.totalJobs || 0}
            </span>
            <span style={{ fontSize: '14px', color: '#6b7280' }}>
              Success Rate: {agent.totalJobs && agent.totalJobs > 0 
                ? ((agent.successfulJobs || 0) / agent.totalJobs * 100).toFixed(1) 
                : 'N/A'}%
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '14px', color: '#6b7280' }}>
              Created: {new Date(agent.createdAt).toLocaleDateString()}
            </span>
            <span style={{ fontSize: '14px', color: '#6b7280' }}>
              Last Active: {new Date(agent.lastActiveAt).toLocaleDateString()}
            </span>
          </div>
        </div>
      )}

      {/* Actions */}
      {(showActions || actions) && (
        <div style={{ 
          display: 'flex', 
          gap: '8px', 
          justifyContent: 'flex-end',
          borderTop: '1px solid #f3f4f6',
          paddingTop: '12px',
          marginTop: '12px'
        }}>
          {actions ? (
            actions
          ) : (
            <>
              {onMessage && (
                <button
                  onClick={handleMessage}
                  style={{
                    backgroundColor: '#f3f4f6',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    padding: '6px 12px',
                    fontSize: '14px',
                    cursor: 'pointer',
                    color: '#374151'
                  }}
                >
                  Message
                </button>
              )}
              {onHire && (
                <button
                  onClick={handleHire}
                  style={{
                    backgroundColor: '#3b82f6',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '6px 12px',
                    fontSize: '14px',
                    cursor: 'pointer',
                    color: 'white'
                  }}
                >
                  Hire
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Status Indicator Component
 */
function StatusIndicator({ status }: { status: string }) {
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
      case 'online':
        return '#10b981';
      case 'busy':
        return '#f59e0b';
      case 'offline':
      case 'inactive':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  return (
    <div
      style={{
        width: '8px',
        height: '8px',
        borderRadius: '4px',
        backgroundColor: getStatusColor(status),
        display: 'inline-block'
      }}
      title={status}
    />
  );
}

export default AgentCard;