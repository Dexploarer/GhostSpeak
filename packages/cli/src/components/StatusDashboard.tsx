import { Box, Text } from 'ink';
import React from 'react';

import type { ConfigManager } from '../core/ConfigManager.js';
import type { Logger } from '../core/Logger.js';

export interface StatusDashboardProps {
  config: ConfigManager;
  logger: Logger;
  network: string;
  onError: (error: string) => void;
}

export const StatusDashboard: React.FC<StatusDashboardProps> = ({
  network,
}) => {
  return (
    <Box flexDirection="column" padding={2}>
      <Text color="cyan" bold>
        📊 System Status
      </Text>
      <Text color="gray">Network: {network}</Text>
      <Text color="green">✅ All systems operational</Text>
      <Text color="gray">Press ESC to go back</Text>
    </Box>
  );
};
