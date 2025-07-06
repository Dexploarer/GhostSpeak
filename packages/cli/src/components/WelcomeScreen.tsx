import { Box, Text, useInput, useApp } from 'ink';
import BigText from 'ink-big-text';
import Divider from 'ink-divider';
import Gradient from 'ink-gradient';
import Spinner from 'ink-spinner';
import React, { useState, useEffect } from 'react';

export interface WelcomeScreenProps {
  version: string;
  onComplete: () => Promise<any>;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  version,
  onComplete,
}) => {
  const { exit } = useApp();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);

  const welcomeSteps = [
    {
      title: 'Welcome to ghostspeak',
      content: 'The future of autonomous agent commerce on Solana',
      duration: 2000,
    },
    {
      title: 'Protocol Initialization',
      content: 'Setting up AI agent infrastructure...',
      duration: 1500,
    },
    {
      title: 'Ready to Begin',
      content: 'Your gateway to autonomous agent commerce is ready',
      duration: 1000,
    },
  ];

  useEffect(() => {
    if (welcomeSteps[step]?.duration) {
      setTimeout(() => {
        setStep(step + 1);
      }, welcomeSteps[step].duration);
    }
  }, [step, welcomeSteps]);

  useInput((input, key) => {
    if (key.escape || (key.ctrl && input === 'c')) {
      exit();
    }

    // Skip to end on any key press
    if (input === ' ' || key.return) {
      setLoading(true);
      onComplete();
    }
  });

  const currentStep = welcomeSteps[step];

  return (
    <Box
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      minHeight={25}
      padding={2}
    >
      {/* ASCII Art Header */}
      <Box marginBottom={3}>
        <Gradient name="pastel">
          <BigText text="ghostspeak" font="block" />
        </Gradient>
      </Box>

      {/* Animated Ghost */}
      <Box marginBottom={2}>
        <Text color="cyan">
          {step === 0 && '     👻'}
          {step === 1 && '   👻💫'}
          {step >= 2 && ' 👻✨🚀'}
        </Text>
      </Box>

      {/* Version Badge */}
      <Box borderStyle="round" borderColor="cyan" padding={1} marginBottom={2}>
        <Text color="cyan">
          v{version} • Autonomous Agent Commerce Protocol
        </Text>
      </Box>

      <Divider width={60} />

      {/* Current Step */}
      <Box flexDirection="column" alignItems="center" marginTop={2}>
        <Text color="white" bold>
          {currentStep?.title}
        </Text>

        <Box marginTop={1}>
          <Text color="gray">{currentStep?.content}</Text>
        </Box>

        {loading && (
          <Box marginTop={2}>
            <Text color="green">
              <Spinner type="dots" /> Launching CLI...
            </Text>
          </Box>
        )}
      </Box>

      {/* Progress Indicator */}
      <Box marginTop={3}>
        <Text color="gray">
          {'●'.repeat(step + 1)}
          {'○'.repeat(welcomeSteps.length - step - 1)}
        </Text>
      </Box>

      {/* Skip Instructions */}
      {!loading && (
        <Box marginTop={2}>
          <Text color="gray" dimColor>
            Press SPACE to skip • ESC to exit
          </Text>
        </Box>
      )}

      {/* Footer */}
      <Box marginTop={4}>
        <Text color="gray" dimColor>
          Built with ❤️ for the future of AI agent commerce
        </Text>
      </Box>
    </Box>
  );
};
