export * as Storage from "./index";

import {
  GetObjectCommand,
  PutObjectCommand,
  PutObjectCommandInput,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createId } from "@paralleldrive/cuid2";
import { Bucket } from "sst/node/bucket";
import { compress } from "../util/compress";

const s3 = new S3Client({});
export async function putEphemeral(
  body: string,
  options?: Omit<
    PutObjectCommandInput,
    "Body" | "Key" | "Bucket" | "ContentEncoding"
  >
) {
  const key = `ephemeral/${createId()}`;

  await s3.send(
    new PutObjectCommand({
      Key: key,
      Bucket: Bucket.storage.bucketName,
      ContentEncoding: "gzip",
      Body: await compress(body),
      ...options,
    })
  );

  const url = await getSignedUrl(
    s3,
    new GetObjectCommand({
      Bucket: Bucket.storage.bucketName,
      Key: key,
    })
  );

  return url;
}
