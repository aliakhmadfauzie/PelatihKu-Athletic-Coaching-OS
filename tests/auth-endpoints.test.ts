import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  authenticateUser,
  changeUserPin,
  provisionUserAccount,
  getUsersDirectory,
  hashPinWithSalt,
  generateCryptoSalt
} from '../server.ts';

describe('PelatihKu PRO — RBAC, PIN Creation & Authentication Backend Logic', () => {
  it('1. Verifies Coach login via PIN 123456 returns role coach and custom token', () => {
    const res = authenticateUser('+628119876543', '123456');

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.data.user.role, 'coach');
    assert.strictEqual(res.data.user.uid, 'pas_coach');
    assert.strictEqual(res.data.mustChangePin, false);
    assert.ok(res.data.customToken.startsWith('pelatihku_jwt_'));
  });

  it('2. Verifies Admin login via PIN 999888 returns role admin', () => {
    const res = authenticateUser('gym_admin', '999888');

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.data.user.role, 'admin');
    assert.strictEqual(res.data.user.uid, 'gym_admin');
  });

  it('3. Verifies Client login via phone-derived PIN (k-01: 34567801) enforces mustChangePin flag', () => {
    const res = authenticateUser('+6281234567801', '34567801');

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.data.user.role, 'client');
    assert.strictEqual(res.data.user.clientId, 'k-01');
    assert.strictEqual(res.data.mustChangePin, true);
  });

  it('4. Verifies invalid PIN returns status 401 with Problem Details', () => {
    const res = authenticateUser('+628119876543', '000000');

    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.success, false);
    assert.match(res.error || '', /tidak cocok/i);
  });

  it('5. Verifies unknown user returns status 401', () => {
    const res = authenticateUser('+6289999999999', '123456');

    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.success, false);
    assert.match(res.error || '', /tidak ditemukan/i);
  });

  it('6. Verifies PIN change validates invariants, hashes new PIN, and clears mustChangePin', () => {
    // Attempt invalid trivial PIN
    const trivialRes = changeUserPin('k-01', '34567801', '123456', '123456');
    assert.strictEqual(trivialRes.status, 400);
    assert.strictEqual(trivialRes.success, false);
    assert.match(trivialRes.error || '', /terlalu mudah ditebak/i);

    // Attempt mismatched confirmation
    const mismatchRes = changeUserPin('k-01', '34567801', '882244', '882255');
    assert.strictEqual(mismatchRes.status, 400);
    assert.strictEqual(mismatchRes.success, false);
    assert.match(mismatchRes.error || '', /tidak cocok/i);

    // Attempt identical to current PIN
    const sameRes = changeUserPin('k-01', '34567801', '34567801', '34567801');
    assert.strictEqual(sameRes.status, 400);
    assert.match(sameRes.error || '', /tidak boleh sama/i);

    // Valid PIN update (6 digits: 882244)
    const validRes = changeUserPin('k-01', '34567801', '882244', '882244');
    assert.strictEqual(validRes.status, 200);
    assert.strictEqual(validRes.success, true);
    assert.strictEqual(validRes.data.mustChangePin, false);

    // Verify user can now log in with the new PIN and mustChangePin is false
    const loginRes = authenticateUser('+6281234567801', '882244');
    assert.strictEqual(loginRes.status, 200);
    assert.strictEqual(loginRes.data.mustChangePin, false);

    // Old PIN should no longer work
    const oldLoginRes = authenticateUser('+6281234567801', '34567801');
    assert.strictEqual(oldLoginRes.status, 401);
  });

  it('7. Verifies Coach/Admin provisioning of new member generates 8-digit phone-derived PIN', () => {
    const res = provisionUserAccount('coach', {
      clientId: 'k-06',
      nama: 'Agus Pratama',
      telepon: '+6285712345678',
      role: 'client'
    });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.data.user.initialPin, '12345678');
    assert.strictEqual(res.data.user.mustChangePin, true);

    // Verify the newly provisioned user can immediately authenticate with their initial PIN
    const loginRes = authenticateUser('+6285712345678', '12345678');
    assert.strictEqual(loginRes.status, 200);
    assert.strictEqual(loginRes.data.user.uid, 'k-06');
    assert.strictEqual(loginRes.data.mustChangePin, true);
  });

  it('8. Verifies non-coach/admin cannot provision users (RBAC gate)', () => {
    const res = provisionUserAccount('client', {
      clientId: 'k-99',
      nama: 'Hacker',
      telepon: '+6289999999999'
    });

    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.success, false);
  });

  it('9. Verifies getUsersDirectory lists all accounts with RBAC roles and masks sensitive fields for non-supervisors', () => {
    const superList = getUsersDirectory('coach');
    assert.ok(superList.length >= 7);

    const coach = superList.find((u) => u.uid === 'pas_coach');
    assert.ok(coach);
    assert.strictEqual(coach.role, 'coach');
    assert.ok(coach.phoneNumber, 'Supervisors can view phone numbers');

    const admin = superList.find((u) => u.uid === 'gym_admin');
    assert.ok(admin);
    assert.strictEqual(admin.role, 'admin');

    const client = superList.find((u) => u.uid === 'k-01');
    assert.ok(client);
    assert.strictEqual(client.role, 'client');

    // For non-supervisors (client), phone numbers are masked
    const clientList = getUsersDirectory('client');
    const maskedClient = clientList.find((u) => u.uid === 'k-01');
    assert.strictEqual(maskedClient?.phoneNumber, undefined, 'Client view masks phone number PII');
  });

  it('10. Verifies cryptographic HMAC-SHA256 salt & hash integrity', () => {
    const salt1 = generateCryptoSalt();
    const salt2 = generateCryptoSalt();
    assert.notStrictEqual(salt1, salt2, 'Salts must be randomly generated and unique');

    const hash1 = hashPinWithSalt('123456', salt1);
    const hash2 = hashPinWithSalt('123456', salt1);
    const hash3 = hashPinWithSalt('123456', salt2);

    assert.strictEqual(hash1, hash2, 'Same PIN and salt must produce deterministic hash');
    assert.notStrictEqual(hash1, hash3, 'Different salts must produce different hashes (rainbow table defense)');
  });
});
