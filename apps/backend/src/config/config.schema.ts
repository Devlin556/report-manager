export interface ServiceConfig {
  environment: string;
  name: string;
}

export interface PortsConfig {
  application: number;
}

export interface RedisServiceConfig {
  host: string;
  port: number;
  password?: string;
}

export interface DatabaseServiceConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
}

export interface S3ServiceConfig {
  /** Endpoint для внутренних операций (upload и т.д.) */
  endpoint: string;
  /** Endpoint для presigned URL — должен быть доступен клиенту (браузеру) */
  publicEndpoint?: string;
  region: string;
  accessKey: string;
  secretKey: string;
  bucket: string;
}

export interface ServicesConfig {
  redis: RedisServiceConfig;
  database: DatabaseServiceConfig;
  s3: S3ServiceConfig;
}

export interface ReportsConfig {
  /** Задержка генерации отчётов (мс), ~20 сек = 18000 */
  generationDelayMs: number;
}

export interface AppConfig {
  service: ServiceConfig;
  ports: PortsConfig;
  services: ServicesConfig;
  reports: ReportsConfig;
}
