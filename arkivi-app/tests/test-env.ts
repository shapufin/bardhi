/**
 * Shared test environment bootstrap.
 * Sets deterministic admin secrets BEFORE route modules read them
 * (verifyAdminAuth reads process.env per request, so order is not critical,
 * but keeping it at import time is safest).
 */

process.env.ADMIN_SECRET = process.env.ADMIN_SECRET || 'test-admin-secret-0123456789';
process.env.PAYLOAD_SECRET = process.env.PAYLOAD_SECRET || 'test-payload-secret-0123456789';
process.env.STUDIO_TOKEN = process.env.STUDIO_TOKEN || '';

export const ADMIN_TOKEN = process.env.ADMIN_SECRET;
export const PAYLOAD_TOKEN = process.env.PAYLOAD_SECRET;
