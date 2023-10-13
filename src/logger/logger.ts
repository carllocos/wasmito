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
}

let logLevel: LogLevel = LogLevel.LogInfo;

export function setLogLevel(level: LogLevel): void {
  logLevel = level;
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

export function createLogger(name: string): winston.Logger {
  return winston.createLogger({
    level: logLevel,
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.timestamp(),
      winston.format.printf(({ timestamp, level, message }) => {
        return `[${timestamp} ${level}] ${name} : ${message}`;
      }),
    ),
    transports: [
      new winston.transports.Console(),
      new winston.transports.File({ filename: 'error.log', level: 'error' }),
      new winston.transports.File({ filename: 'combined.log' }),
    ],
  });
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
          return `[${timestamp} ${level}]: ${message}`;
        }),
      ),
      transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'error.log', level: 'error' }),
        new winston.transports.File({ filename: 'combined.log' }),
      ],
    });
  }

  return globalLogger;
}
