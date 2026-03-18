import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { BadRequestError } from "./errors.js";

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    // ✓ Nested
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

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

export default {
  uploadToS3,
};
