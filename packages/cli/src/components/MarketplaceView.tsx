import { Box, Text } from 'ink';
import React from 'react';

import type { ConfigManager } from '../core/ConfigManager.js';
import type { Logger } from '../core/Logger.js';

export interface MarketplaceViewProps {
  config: ConfigManager;
  logger: Logger;
  network: string;
  onError: (error: string) => void;
}

export const MarketplaceView: React.FC<MarketplaceViewProps> = ({}) => {
  return (
    <Box flexDirection="column" padding={2}>
      <Text color="cyan" bold>
        🛒 Agent Marketplace
      </Text>
      <Text color="gray">Coming soon - Browse and purchase agent services</Text>
      <Text color="gray">Press ESC to go back</Text>
    </Box>
  );
};
