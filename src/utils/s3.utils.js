import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { BadRequestError } from "./errors.utils.js";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    // ✓ Nested
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const extractS3KeyFromUrl = (url) => {
  const urlParts = url.split("/");
  return urlParts.slice(3).join("/"); // Skip the bucket name and region
}

const uploadToS3 = async (file, folder) => {
  const bucketName = process.env.AWS_S3_BUCKET;
  const key = `${folder}/${Date.now()}_${file.originalname}`;
  const params = {
    Bucket: bucketName,
    Key: key,
    Body: file.buffer,
    ContentType: file.mimetype,
  };
  try {
    await s3.send(new PutObjectCommand(params));
    return `https://${bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
  } catch (error) {
    throw new BadRequestError("Failed to upload to S3.");
  }
};

const deleteFromS3 = async (fileURL) => {
  const bucketName = process.env.AWS_S3_BUCKET;
  const key = extractS3KeyFromUrl(fileURL);
  const params = {
    Bucket: bucketName,
    Key: key,
  };
  try {
    await s3.send(new DeleteObjectCommand(params));
  } catch (error) {
    throw new BadRequestError("Failed to delete from S3.");
  }
};

const getPresignedUrl = async (fileURL, expiresIn = 900) => {
  const bucketName = process.env.AWS_S3_BUCKET;
  const key = extractS3KeyFromUrl(fileURL);
  const params = {
    Bucket: bucketName,
    Key: key,
  };
  try {
    const url = await getSignedUrl(s3, new GetObjectCommand(params), { expiresIn });
    return url;
  } catch (error) {
    throw new BadRequestError("Failed to get presigned URL.");
  }
};

export default {
  uploadToS3,
  deleteFromS3,
  getPresignedUrl,
};
