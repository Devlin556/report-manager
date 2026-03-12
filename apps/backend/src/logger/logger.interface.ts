export type LogLevel = 'log' | 'error' | 'warn' | 'debug' | 'verbose';

export interface LoggerInterface {
    log(message: string, ...optionalParams: unknown[]): void;
    error(message: string, ...optionalParams: unknown[]): void;
    warn(message: string, ...optionalParams: unknown[]): void;
    debug?(message: string, ...optionalParams: unknown[]): void;
    verbose?(message: string, ...optionalParams: unknown[]): void;
}
