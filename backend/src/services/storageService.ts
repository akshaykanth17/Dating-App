import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';

export interface IStorageService {
  uploadPhoto(file: Express.Multer.File): Promise<string>;
  deletePhoto(fileUrl: string): Promise<void>;
}

export class LocalStorageService implements IStorageService {
  private uploadDir: string;

  constructor() {
    this.uploadDir = process.env.UPLOAD_DIR || 'uploads';
    // Ensure upload directory exists
    const fullPath = path.resolve(this.uploadDir);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
    }
  }

  async uploadPhoto(file: Express.Multer.File): Promise<string> {
    const filename = `${uuidv4()}.webp`;
    const destinationPath = path.join(path.resolve(this.uploadDir), filename);

    // Resize to max width/height of 800px, convert to webp format, and strip metadata (EXIF/location data)
    const webpBuffer = await sharp(file.buffer)
      .resize(800, 800, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .toFormat('webp', { quality: 80 })
      .toBuffer();

    // Also attempt writing to local directory if filesystem is accessible
    try {
      await fs.promises.writeFile(destinationPath, webpBuffer);
    } catch {
      // Ignored if ephemeral or read-only filesystem
    }

    // Return data URL so images are 100% resilient across ephemeral hosting restarts and redeployments
    return `data:image/webp;base64,${webpBuffer.toString('base64')}`;
  }

  async deletePhoto(fileUrl: string): Promise<void> {
    if (!fileUrl || fileUrl.startsWith('data:')) return;
    try {
      const filename = path.basename(fileUrl);
      const filePath = path.join(path.resolve(this.uploadDir), filename);

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch {
      // Ignore cleanup error on deleted files
    }
  }
}

// Minimal placeholder implementation for S3. Since S3-compatible credentials aren't provided, 
// this allows us to remain fully architectural.
export class S3StorageService implements IStorageService {
  constructor() {
    // S3 client configuration would go here using @aws-sdk/client-s3
  }

  async uploadPhoto(file: Express.Multer.File): Promise<string> {
    // In production, we would resize + strip EXIF locally first:
    const filename = `${uuidv4()}.webp`;
    const buffer = await sharp(file.buffer)
      .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
      .toFormat('webp', { quality: 80 })
      .toBuffer();

    // Then upload buffer to S3 using S3Client.send(new PutObjectCommand(...))
    console.log(`[S3StorageService] Uploading ${filename} to S3 bucket... (Simulated)`);
    return `https://${process.env.S3_BUCKET_NAME || 'tapin-bucket'}.s3.amazonaws.com/${filename}`;
  }

  async deletePhoto(fileUrl: string): Promise<void> {
    const filename = path.basename(fileUrl);
    console.log(`[S3StorageService] Deleting ${filename} from S3 bucket... (Simulated)`);
  }
}

export function getStorageService(): IStorageService {
  const storageType = process.env.STORAGE_TYPE || 'local';
  if (storageType === 's3') {
    return new S3StorageService();
  }
  return new LocalStorageService();
}
