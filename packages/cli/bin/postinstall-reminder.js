#!/usr/bin/env node

logger.general.info('\n\u2728 ghostspeak CLI installed!');
logger.general.info(
  '\n\uD83D\uDD0E If you see "command not found: ghostspeak" or "gs", add your global bin directory to your PATH:'
);
logger.general.info('\nFor npm:    export PATH="$(npm bin -g):$PATH"');
logger.general.info('For Bun:    export PATH="$HOME/.bun/bin:$PATH"');
logger.general.info(
  '\nRestart your terminal or run the above command to use "ghostspeak" and "gs" from anywhere.'
);
logger.general.info('\n\uD83D\uDE80 Happy hacking!\n');
