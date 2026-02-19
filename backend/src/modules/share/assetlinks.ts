import { Request, Response } from 'express';

export function assetLinks(_req: Request, res: Response): void {
  res.json([{
    relation: ['delegate_permission/common.handle_all_urls'],
    target: {
      namespace: 'android_app',
      package_name: 'com.thirtysecchallenge.thirty_sec_challenge',
      sha256_cert_fingerprints: [process.env.ANDROID_SHA256_FINGERPRINT || 'TODO:ADD_SHA256_FINGERPRINT'],
    },
  }]);
}
