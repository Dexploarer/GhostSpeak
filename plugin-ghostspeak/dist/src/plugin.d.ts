import type { IAgentRuntime, Plugin } from '@elizaos/core';
import { Service } from '@elizaos/core';
export declare class StarterService extends Service {
    protected runtime: IAgentRuntime;
    static serviceType: string;
    capabilityDescription: string;
    constructor(runtime: IAgentRuntime);
    static start(runtime: IAgentRuntime): Promise<StarterService>;
    static stop(runtime: IAgentRuntime): Promise<void>;
    stop(): Promise<void>;
}
export declare const starterPlugin: Plugin;
export default starterPlugin;
//# sourceMappingURL=plugin.d.ts.map