export interface S3DiskConfig {
  driver: 's3';
  key: string;
  secret: string;
  region: string;
  bucket: string;
  url?: string;
  endpoint?: string;
}