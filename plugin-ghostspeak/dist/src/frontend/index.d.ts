import './index.css';
import React from 'react';
export interface AgentPanel {
    name: string;
    path: string;
    component: React.ComponentType<any>;
    icon?: string;
    public?: boolean;
    shortLabel?: string;
}
export declare const panels: AgentPanel[];
export * from './utils';
//# sourceMappingURL=index.d.ts.map