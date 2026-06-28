import crypto from "crypto";

export function generateSignature(
  payload: Buffer | string,
  secret: string,
): string {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

export function verifySignature(
  payload: Buffer,
  secret: string,
  receivedSignature: string,
): boolean {
  const expectedSignature = generateSignature(payload, secret);

  const expectedBuffer = Buffer.from(expectedSignature, "hex");
  const receivedBuffer = Buffer.from(receivedSignature, "hex");

  if (expectedBuffer.length !== receivedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
}
