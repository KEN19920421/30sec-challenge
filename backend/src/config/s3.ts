import { S3Client, S3ClientConfig } from '@aws-sdk/client-s3';
import { logger } from './logger';

export interface S3Config {
  endpoint: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  cdnBaseUrl: string;
}

const s3Config: S3Config = {
  endpoint: process.env.S3_ENDPOINT || 'http://localhost:9000',
  region: process.env.S3_REGION || 'us-east-1',
  bucket: process.env.S3_BUCKET || 'video-challenge',
  accessKeyId: process.env.S3_ACCESS_KEY || 'minioadmin',
  secretAccessKey: process.env.S3_SECRET_KEY || 'minioadmin',
  cdnBaseUrl: process.env.CDN_BASE_URL || 'http://localhost:9000/video-challenge',
};

const clientConfig: S3ClientConfig = {
  endpoint: s3Config.endpoint,
  region: s3Config.region,
  credentials: {
    accessKeyId: s3Config.accessKeyId,
    secretAccessKey: s3Config.secretAccessKey,
  },
  forcePathStyle: true, // Required for MinIO and other S3-compatible services
};

const s3Client = new S3Client(clientConfig);

logger.info('S3 client initialized', {
  endpoint: s3Config.endpoint,
  region: s3Config.region,
  bucket: s3Config.bucket,
});

export { s3Client, s3Config };
export default s3Client;
