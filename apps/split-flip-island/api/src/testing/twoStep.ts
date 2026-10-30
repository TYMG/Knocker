// The authenticator a test admin "has": a fixed secret, sealed the way the server keeps it.
import { codeAt, seal, stepAt } from '../totp.js';

export const TEST_TOTP_SECRET = 'JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP';
/** The sealed secret for an admin item in the fake table. */
export const testTotp = () => seal(TEST_TOTP_SECRET);
/** The code the test admin's app shows right now (or `steps` later). */
export const testCode = (steps = 0, secret = TEST_TOTP_SECRET) => codeAt(secret, stepAt(Date.now()) + steps);
