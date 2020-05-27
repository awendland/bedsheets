export enum LogLevel {
  // In order of decreasing severity / increasing verbosity
  NONE,
  ERROR,
  WARN,
  INFO,
  TRACE,
}

export type LogLevelStr = keyof typeof LogLevel

let logLevel: LogLevel = LogLevel.ERROR

export const setLevelByString = (strLevel: string, shouldThrow = true) => {
  strLevel = strLevel.toUpperCase()
  let level: LogLevel | undefined = LogLevel[strLevel as LogLevelStr]
  if (typeof level === "undefined") {
    level = LogLevel.INFO
    const validIds = Object.keys(LogLevel).join(", ")
    const message = `Invalid LogLevel specified: unknown level '${strLevel}'. Valid identifiers: ${validIds}`
    if (shouldThrow) throw new Error(`${message}\nDefaulting LogLevel ${level}`)
    console.error(message)
  }
  setLevel(level)
}

export const setLevel = (level: LogLevel) => (logLevel = level)

export const error = (...args: any[]) => {
  if (logLevel >= LogLevel.ERROR) console.error(...args)
}

export const warn = (...args: any[]) => {
  if (logLevel >= LogLevel.WARN) console.warn(...args)
}

export const info = (...args: any[]) => {
  if (logLevel >= LogLevel.INFO) console.warn(...args)
}

export const trace = (...args: any[]) => {
  if (logLevel >= LogLevel.TRACE) console.warn(...args)
}

export const traceIf = async (fn: () => any | PromiseLike<any>) => {
  if (logLevel >= LogLevel.TRACE) trace(...(await fn()))
}

export const doIf = async (level: LogLevel, fn: () => {} | PromiseLike<{}>) => {
  if (logLevel >= level) await fn()
}
