import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

async function uploadApk() {
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
    const endpoint = process.env.R2_ENDPOINT;
    const bucket = process.env.R2_BUCKET_NAME;
    const publicUrl = process.env.R2_PUBLIC_URL;

    if (!accessKeyId || !secretAccessKey || !endpoint || !bucket) {
        console.error("Missing R2 credentials in .env.local");
        process.exit(1);
    }

    const s3 = new S3Client({
        region: "auto",
        endpoint,
        credentials: {
            accessKeyId,
            secretAccessKey,
        },
        forcePathStyle: true,
    });

    const apkPath = path.resolve(__dirname, "../public/TTC-Network.apk");
    if (!fs.existsSync(apkPath)) {
        console.error("APK not found at:", apkPath);
        process.exit(1);
    }

    const fileBuffer = fs.readFileSync(apkPath);
    console.log(`Uploading ${apkPath} (${(fileBuffer.length / (1024 * 1024)).toFixed(2)} MB) to R2 bucket "${bucket}"...`);

    const key = "app/TTC-Network.apk";
    await s3.send(
        new PutObjectCommand({
            Bucket: bucket,
            Key: key,
            Body: fileBuffer,
            ContentType: "application/vnd.android.package-archive",
            ContentDisposition: 'attachment; filename="TTC-Network.apk"',
            CacheControl: "public, max-age=300",
        })
    );

    console.log("Upload successful!");
    console.log(`Direct Public R2 URL: ${publicUrl}/${key}`);
}

uploadApk().catch((err) => {
    console.error("Upload failed:", err);
    process.exit(1);
});
