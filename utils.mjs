import crypto from "node:crypto";

export const generateNonce = () => crypto.randomBytes(16).toString();
