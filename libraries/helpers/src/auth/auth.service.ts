import { sign, verify } from 'jsonwebtoken';
import { hashSync, compareSync } from 'bcrypt';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

const ENCRYPTION_ALGORITHM = 'aes-256-cbc';

function deriveKeyAndIv(secret: string) {
  // Replicate deprecated createCipher password-based derivation (EVP_BytesToKey)
  const password = Buffer.from(secret, 'utf8');
  const keyLength = 32; // aes-256
  const ivLength = 16; // block size
  let derived = Buffer.alloc(0);
  let prev = Buffer.alloc(0);

  while (derived.length < keyLength + ivLength) {
    const md5 = crypto.createHash('md5');
    md5.update(prev);
    md5.update(password);
    prev = md5.digest();
    derived = Buffer.concat([derived, prev]);
  }

  return {
    key: derived.subarray(0, keyLength),
    iv: derived.subarray(keyLength, keyLength + ivLength),
  };
}

export class AuthService {
  static hashPassword(password: string) {
    return hashSync(password, 10);
  }
  static comparePassword(password: string, hash: string) {
    return compareSync(password, hash);
  }
  static signJWT(value: object) {
    return sign(value, process.env.JWT_SECRET!);
  }
  static verifyJWT(token: string) {
    return verify(token, process.env.JWT_SECRET!);
  }

  static fixedEncryption(value: string) {
    const secret = process.env.JWT_SECRET!;
    const { key, iv } = deriveKeyAndIv(secret);
    const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, key, iv);

    let encrypted = cipher.update(value, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return encrypted;
  }

  static fixedDecryption(hash: string) {
    const secret = process.env.JWT_SECRET!;
    const { key, iv } = deriveKeyAndIv(secret);
    const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, key, iv);

    let decrypted = decipher.update(hash, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }
}
