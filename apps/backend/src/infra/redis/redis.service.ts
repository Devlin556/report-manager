import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import { ConfigService } from '../../config/config.service';
import { LoggerService } from 'src/logger/logger.service';

function createRedisClient(config: ConfigService): Redis {
  const { host, port, password } = config.getServices().redis;
  const client = new Redis({
    host,
    port,
    password: password ?? undefined,
    retryStrategy: (times) => Math.min(times * 100, 3000),
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    connectTimeout: 10000,
  });
  client.on('error', () => {}); // подавляем unhandled rejection при закрытии
  return client;
}

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client!: Redis;
  private readonly logger = LoggerService.create(RedisService.name);

  private readonly subscriberClients = new Set<Redis>();

  constructor(
    private readonly config: ConfigService,
  ) {
  }

  async onModuleInit(): Promise<void> {
    this.client = createRedisClient(this.config);
    this.logger.log('Connecting to Redis...');
    await new Promise<void>((resolve, reject) => {
      
      if (this.client.status === 'ready') {
        this.logger.log('Redis connected');
        resolve();
        return;
      }

      this.client.once('ready', () => {
        this.logger.log('Redis connected');
        resolve();
      });

      this.client.once('error', (err) => {
        this.logger.error('Error connecting to Redis', err);
        reject(err);
      });
    });
  }

  getClient(): Redis {
    return this.client;
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds != null) {
      await this.client.setex(key, ttlSeconds, value);
    } else {
      await this.client.set(key, value);
    }
  }

  async publish(channel: string, message: string): Promise<number> {
    return this.client.publish(channel, message);
  }

  subscribeToStatus(
    reportId: string,
    onStatus: (payload: { status: string; s3Key?: string }) => void,
  ): () => void {
    const channel = `report:${reportId}:updates`;
    const subscriber = createRedisClient(this.config);

    this.subscriberClients.add(subscriber);
    let closed = false;

    subscriber.subscribe(channel).then(() => {
      subscriber.on('message', (_ch: string, message: string) => {
        if (closed) return;
        
        try {
          onStatus(JSON.parse(message));
        } catch {
          // ignore
        }
      });
    });

    subscriber.on('error', () => {});

    return () => {
      closed = true;
      this.subscriberClients.delete(subscriber);
      subscriber.unsubscribe(channel).finally(() => subscriber.disconnect());
    };
  }

  async onModuleDestroy(): Promise<void> {
    for (const c of this.subscriberClients) {
      c.disconnect();
    }
    this.subscriberClients.clear();
    this.client.disconnect();
  }
}
