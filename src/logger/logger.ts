import winston from 'winston';

export enum LogLevel {
  LogInfo = 'info',
  LogDebug = 'debug',
  LogError = 'error',
  LogEmerg = 'emerg',
  LogAlert = 'alert',
  LogCritical = 'crit',
  LogWarning = 'warning',
  LogNotice = 'notice',
  LogOff = 'off',
}

export type Logger = winston.Logger;

export function getLogLevelFromString(
  levelString: string,
): LogLevel | undefined {
  switch (levelString) {
    case 'info':
      return LogLevel.LogInfo;
    case 'debug':
      return LogLevel.LogDebug;
    case 'error':
      return LogLevel.LogError;
    case 'emerg':
      return LogLevel.LogEmerg;
    case 'alert':
      return LogLevel.LogAlert;
    case 'crit':
      return LogLevel.LogCritical;
    case 'warning':
      return LogLevel.LogWarning;
    case 'notice':
      return LogLevel.LogNotice;
    case 'off':
      return LogLevel.LogOff;
    default:
      return undefined;
  }
}

let logLevel: LogLevel =
  getLogLevelFromString(process.env.LogLevel ?? 'info') ?? LogLevel.LogInfo;

let loggerName = process.env.LoggerName ?? '';

export function setLogLevel(level: LogLevel): void {
  logLevel = level;
}

export function setGlobalLoggerName(n: string): void {
  loggerName = n;
}

export function parseLogLevel(value: string): LogLevel | undefined {
  for (const key of Object.keys(LogLevel)) {
    const enumValue = LogLevel[key as keyof typeof LogLevel];
    if (enumValue === value) {
      return enumValue;
    }
  }
  return undefined;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function createLogger(name: string, level?: LogLevel): winston.Logger {
  const cleanedName = name.trim();
  const _logger = winston.createLogger({
    level: logLevel,
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.timestamp(),
      winston.format.printf(({ timestamp, level, message }) => {
        return `[${timestamp} ${level}] ${cleanedName}: ${message}`;
      }),
    ),
    transports: [
      new winston.transports.Console(),
      // new winston.transports.File({ filename: 'error.log', level: 'error' }),
      // new winston.transports.File({ filename: 'combined.log' }),
    ],
  });
  if (logLevel === LogLevel.LogOff) {
    _logger.remove(winston.transports.Console);
  }
  return _logger;
}

let globalLogger: winston.Logger | undefined;

export function getGlobalLogger(): winston.Logger {
  if (
    globalLogger === undefined ||
    globalLogger.level !== logLevel.toString()
  ) {
    globalLogger = winston.createLogger({
      level: logLevel,
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message }) => {
          return `[${timestamp} ${level}] ${loggerName}: ${message}`;
        }),
      ),
      transports: [
        new winston.transports.Console(),
        // new winston.transports.File({ filename: 'error.log', level: 'error' }),
        // new winston.transports.File({ filename: 'combined.log' }),
      ],
    });

    if (logLevel === LogLevel.LogOff) {
      globalLogger.remove(winston.transports.Console);
    }
  }

  return globalLogger;
}
