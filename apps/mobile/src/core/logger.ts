type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_RANK: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40
};

/** Default: debug in __DEV__, info otherwise. Override via setLogLevel. */
let minLevel: LogLevel = typeof __DEV__ !== 'undefined' && __DEV__ ? 'debug' : 'info';

export function setLogLevel(level: LogLevel): void {
  minLevel = level;
}

function shouldLog(level: LogLevel): boolean {
  return LEVEL_RANK[level] >= LEVEL_RANK[minLevel];
}

function emit(level: LogLevel, scope: string, message: string, meta?: unknown): void {
  if (!shouldLog(level)) return;
  const prefix = `[FitPulse:${scope}]`;
  const args = meta === undefined ? [prefix, message] : [prefix, message, meta];
  switch (level) {
    case 'debug':
      console.debug(...args);
      break;
    case 'info':
      console.info(...args);
      break;
    case 'warn':
      console.warn(...args);
      break;
    case 'error':
      console.error(...args);
      break;
  }
}

/** Scoped logger — prefer this over raw console in app code. */
export function createLogger(scope: string) {
  return {
    debug: (message: string, meta?: unknown) => emit('debug', scope, message, meta),
    info: (message: string, meta?: unknown) => emit('info', scope, message, meta),
    warn: (message: string, meta?: unknown) => emit('warn', scope, message, meta),
    error: (message: string, meta?: unknown) => emit('error', scope, message, meta)
  };
}

export const log = createLogger('app');
