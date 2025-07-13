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
export declare function AgentCard({ agent, detailed, showActions, actions, onClick, onMessage, onHire, className, style }: AgentCardProps): import("react/jsx-runtime").JSX.Element;
export default AgentCard;
//# sourceMappingURL=AgentCard.d.ts.map