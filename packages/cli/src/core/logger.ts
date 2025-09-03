import pino from 'pino'
import chalk from 'chalk'

const isProduction = process.env.NODE_ENV === 'production'

const prettyPrintOptions = {
  colorize: true,
  levelFirst: true,
  translateTime: 'SYS:standard',
  ignore: 'pid,hostname',
}

const pinoOptions: pino.LoggerOptions = {
  level: process.env.LOG_LEVEL || 'info',
}

if (!isProduction) {
  pinoOptions.transport = {
    target: 'pino-pretty',
    options: prettyPrintOptions,
  }
}

const pinoLogger = pino(pinoOptions)

export class LoggerService {
  private logger: pino.Logger

  constructor() {
    this.logger = pinoLogger
  }

  info(message: string, data?: Record<string, any>) {
    this.logger.info(data, message)
  }

  warn(message: string, data?: Record<string, any>) {
    this.logger.warn(data, message)
  }

  error(message: string, error?: Error, data?: Record<string, any>) {
    this.logger.error({ err: error, ...data }, message)
  }

  debug(message: string, data?: Record<string, any>) {
    this.logger.debug(data, message)
  }

  fatal(message: string, error?: Error, data?: Record<string, any>) {
    this.logger.fatal({ err: error, ...data }, message)
  }

  handleError(error: any, message: string) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred'
    this.error(message, error)
    console.error(chalk.red(`❌ ${message}: ${errorMessage}`))
  }
}

export const logger = new LoggerService()
