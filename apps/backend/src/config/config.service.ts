import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import type { AppConfig } from './config.schema';

@Injectable()
export class ConfigService {
  private readonly config: AppConfig;

  constructor() {
    const configPath = path.join(process.cwd(), 'config', 'config.yml');
    const fileContent = fs.readFileSync(configPath, 'utf8');
    this.config = yaml.load(fileContent) as AppConfig;
  }

  get(): AppConfig {
    return this.config;
  }

  getService() {
    return this.config.service;
  }

  getPorts() {
    return this.config.ports;
  }

  getServices() {
    return this.config.services;
  }

  getReports() {
    return this.config.reports;
  }
}
