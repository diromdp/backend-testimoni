import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3 } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AssetService {
  private s3: S3;
  private bucket: string;

  constructor(private configService: ConfigService) {
    const accessKeyId = this.configService.get('VULTR_ACCESS_KEY') || '';
    const secretAccessKey = this.configService.get('VULTR_SECRET_KEY') || '';
    
    // Initialize S3 client with Vultr Object Storage credentials
    this.s3 = new S3({
      endpoint: `https://${this.configService.get('VULTR_STORAGE_HOST')}`,
      region: 'us-east-1', // This is required but not used by Vultr
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      forcePathStyle: true, // Required for Vultr Object Storage
    });
    
    this.bucket = this.configService.get('VULTR_BUCKET_NAME') || 'testimoni';
  }

  /**
   * Upload an image to Vultr Object Storage
   * @param file The file to upload
   * @param folder Optional subfolder within the Images directory
   * @returns The URL of the uploaded image
   */
  async uploadImage(file: Express.Multer.File, folder?: string): Promise<{ url: string }> {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    // Validate file type
    if (!file.mimetype.includes('image')) {
      throw new BadRequestException('Only image files are allowed');
    }

    try {
      // Generate a unique filename
      const fileExtension = file.originalname.split('.').pop();
      const fileName = `${uuidv4()}.${fileExtension}`;
      
      // Create path: Assets/Images/[optional-folder]/filename
      const key = folder 
        ? `Assets/Images/${folder}/${fileName}`
        : `Assets/Images/${fileName}`;

      // Upload to Vultr Object Storage
      await this.s3.putObject({
        Bucket: this.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
        ACL: 'public-read',
      });

      // Construct the URL
      const host = this.configService.get('VULTR_STORAGE_HOST');
      const url = `https://${host}/${this.bucket}/${key}`;

      return { url };
    } catch (error) {
      console.error('Error uploading file:', error);
      throw new BadRequestException('Failed to upload image');
    }
  }

  /**
   * Delete an image from Vultr Object Storage permanently
   * @param url The URL of the image to delete
   */
  async deleteImage(url: string): Promise<void> {
    try {
      // Extract the key from the URL
      const host = this.configService.get('VULTR_STORAGE_HOST');
      const bucketName = this.configService.get('VULTR_BUCKET_NAME') || 'testimoni';
      const baseUrl = `https://${host}/${bucketName}/`;
      
      if (!url.startsWith(baseUrl)) {
        throw new BadRequestException('Invalid image URL');
      }
      
      const key = url.substring(baseUrl.length);

      // Delete from Vultr Object Storage with versioning consideration
      await this.s3.deleteObject({
        Bucket: this.bucket,
        Key: key,
      });
      
      // For permanent deletion, we can also remove any potential versioned objects
      try {
        const listVersions = await this.s3.listObjectVersions({
          Bucket: this.bucket,
          Prefix: key,
        });
        
        if (listVersions.Versions?.length || listVersions.DeleteMarkers?.length) {
          const deleteParams = {
            Bucket: this.bucket,
            Delete: {
              Objects: [
                ...(listVersions.Versions || []).map(version => ({
                  Key: key,
                  VersionId: version.VersionId,
                })),
                ...(listVersions.DeleteMarkers || []).map(marker => ({
                  Key: key,
                  VersionId: marker.VersionId,
                })),
              ],
              Quiet: false,
            },
          };
          
          if (deleteParams.Delete.Objects.length > 0) {
            await this.s3.deleteObjects(deleteParams);
          }
        }
      } catch (versionError) {
        console.warn('Version cleanup failed, object may still be deleted:', versionError);
        // Continue execution as the main object was still deleted
      }
    } catch (error) {
      console.error('Error deleting file:', error);
      throw new BadRequestException('Failed to delete image');
    }
  }

  /**
   * Upload a video to Vultr Object Storage
   * @param file The file to upload
   * @param folder Optional subfolder within the Videos directory
   * @returns The URL of the uploaded video
   */
  async uploadVideo(file: Express.Multer.File, folder?: string): Promise<{ url: string }> {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    // Validate file type
    if (!file.mimetype.includes('video')) {
      throw new BadRequestException('Only video files are allowed');
    }

    try {
      // Generate a unique filename
      const fileExtension = file.originalname.split('.').pop();
      const fileName = `${uuidv4()}.${fileExtension}`;
      
      // Create path: Assets/Videos/[optional-folder]/filename
      const key = folder 
        ? `Assets/Videos/${folder}/${fileName}`
        : `Assets/Videos/${fileName}`;

      // Upload to Vultr Object Storage
      await this.s3.putObject({
        Bucket: this.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
        ACL: 'public-read',
      });

      // Construct the URL
      const host = this.configService.get('VULTR_STORAGE_HOST');
      const url = `https://${host}/${this.bucket}/${key}`;

      return { url };
    } catch (error) {
      console.error('Error uploading file:', error);
      throw new BadRequestException('Failed to upload video');
    }
  }

  /**
   * Delete a video from Vultr Object Storage permanently
   * @param url The URL of the video to delete
   */
  async deleteVideo(url: string): Promise<void> {
    try {
      // Extract the key from the URL
      const host = this.configService.get('VULTR_STORAGE_HOST');
      const bucketName = this.configService.get('VULTR_BUCKET_NAME') || 'testimoni';
      const baseUrl = `https://${host}/${bucketName}/`;
      
      if (!url.startsWith(baseUrl)) {
        throw new BadRequestException('Invalid video URL');
      }
      
      const key = url.substring(baseUrl.length);

      // Delete from Vultr Object Storage with versioning consideration
      await this.s3.deleteObject({
        Bucket: this.bucket,
        Key: key,
      });
      
      // For permanent deletion, we can also remove any potential versioned objects
      try {
        const listVersions = await this.s3.listObjectVersions({
          Bucket: this.bucket,
          Prefix: key,
        });
        
        if (listVersions.Versions?.length || listVersions.DeleteMarkers?.length) {
          const deleteParams = {
            Bucket: this.bucket,
            Delete: {
              Objects: [
                ...(listVersions.Versions || []).map(version => ({
                  Key: key,
                  VersionId: version.VersionId,
                })),
                ...(listVersions.DeleteMarkers || []).map(marker => ({
                  Key: key,
                  VersionId: marker.VersionId,
                })),
              ],
              Quiet: false,
            },
          };
          
          if (deleteParams.Delete.Objects.length > 0) {
            await this.s3.deleteObjects(deleteParams);
          }
        }
      } catch (versionError) {
        console.warn('Version cleanup failed, object may still be deleted:', versionError);
        // Continue execution as the main object was still deleted
      }
    } catch (error) {
      console.error('Error deleting file:', error);
      throw new BadRequestException('Failed to delete video');
    }
  }
}


