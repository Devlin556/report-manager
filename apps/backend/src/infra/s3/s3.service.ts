import { Injectable } from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  CreateBucketCommand,
  HeadBucketCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { ConfigService } from '../../config/config.service';

@Injectable()
export class S3Service {
  private readonly client: S3Client;
  private readonly signClient: S3Client;
  private readonly bucket: string;
  private initPromise: Promise<void> | null = null;

  constructor(private readonly config: ConfigService) {
    const { endpoint, publicEndpoint, region, accessKey, secretKey, bucket } = config.getServices().s3;
    this.bucket = bucket;
    this.client = new S3Client({
      region,
      endpoint,
      credentials: { accessKeyId: accessKey, secretAccessKey: secretKey },
      forcePathStyle: true,
    });
    // Для presigned URL — endpoint, доступный клиенту (браузеру)
    const signEndpoint = publicEndpoint ?? endpoint;
    this.signClient = new S3Client({
      region,
      endpoint: signEndpoint,
      credentials: { accessKeyId: accessKey, secretAccessKey: secretKey },
      forcePathStyle: true,
    });
  }

  private async ensureBucket(): Promise<void> {
    if (this.initPromise) return this.initPromise;
    this.initPromise = (async () => {
      try {
        await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
      } catch {
        await this.client.send(new CreateBucketCommand({ Bucket: this.bucket }));
      }
    })();
    return this.initPromise;
  }

  async upload(key: string, body: Buffer, contentType?: string): Promise<void> {
    await this.ensureBucket();
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType ?? 'application/octet-stream',
      }),
    );
  }

  async getSignedDownloadUrl(key: string, expiresIn = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });
    return getSignedUrl(this.signClient, command, { expiresIn });
  }

  async delete(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
    );
  }
}
