import { Logger } from '@nestjs/common';
import type { LoggerInterface } from './logger.interface';

export class LoggerService implements LoggerInterface {
  private readonly logger: Logger;

  constructor(tag: string) {
    this.logger = new Logger(tag);
  }

  static create(tag: string): LoggerService {
    return new LoggerService(tag);
  }

  log(message: string, ...params: unknown[]): void {
    this.logger.log(message, ...params);
  }

  error(message: string, ...params: unknown[]): void {
    this.logger.error(message, ...params);
  }

  warn(message: string, ...params: unknown[]): void {
    this.logger.warn(message, ...params);
  }

  debug(message: string, ...params: unknown[]): void {
    this.logger.debug?.(message, ...params);
  }

  verbose(message: string, ...params: unknown[]): void {
    this.logger.verbose?.(message, ...params);
  }
}
