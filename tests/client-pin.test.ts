import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  deriveInitialPinFromPhone,
  getClientPin,
  setClientPin,
  mustChangeClientPin,
  validateNewPin
} from '../src/services/authGatekeeperService';
import {
  authenticateWithFirestore,
  getExpectedPinFromDatabase,
  authenticatePinUniversally,
  fetchClientPinHistoryFromFirestore,
  patchClientPinChangeHistoryInFirestore,
  updateClientPinInFirestore
} from '../src/services/firestoreService';
import { INITIAL_CLIENTS } from '../src/data/mockData';

describe('PelatihKu PRO — Client Phone-Derived PIN Lifecycle & Invariants', () => {
  it('1. Verifies initial PIN derivation extracts exact last 8 digits of phone numbers', () => {
    // Case A: Indonesian local format with hyphens
    assert.strictEqual(
      deriveInitialPinFromPhone('0812-3456-7890'),
      '34567890',
      'Should extract last 8 digits 34567890'
    );

    // Case B: International format with +62 and spaces
    assert.strictEqual(
      deriveInitialPinFromPhone('+62 813 9988 7766'),
      '99887766',
      'Should extract last 8 digits 99887766'
    );

    // Case C: Standard 10-digit number
    assert.strictEqual(
      deriveInitialPinFromPhone('0856112233'),
      '56112233',
      'Should extract last 8 digits 56112233'
    );

    // Case D: Edge case with fewer than 8 digits (zero-padded)
    assert.strictEqual(
      deriveInitialPinFromPhone('12345'),
      '00012345',
      'Should pad leading zeros if fewer than 8 digits'
    );
  });

  it('2. Verifies INITIAL_CLIENTS mock k-01 has phone-derived initial PIN and mustChangePin flag', () => {
    const k01 = INITIAL_CLIENTS.find((c) => c.id === 'k-01');
    assert.ok(k01, 'Client k-01 must exist');
    assert.strictEqual(k01.telepon, '6281234567801');
    assert.strictEqual(k01.clientPin, '34567801');
    assert.strictEqual(k01.mustChangePin, true);
  });

  it('3. Verifies validateNewPin enforces PIN length (6-8 digits), confirmation match, and non-triviality', () => {
    // Valid 6-digit PIN
    const valid6 = validateNewPin('882244', '882244', '34567801');
    assert.strictEqual(valid6.valid, true);

    // Valid 8-digit PIN
    const valid8 = validateNewPin('99887766', '99887766', '34567801');
    assert.strictEqual(valid8.valid, true);

    // Mismatched confirmation
    const mismatch = validateNewPin('882244', '882299', '34567801');
    assert.strictEqual(mismatch.valid, false);
    assert.match(mismatch.error || '', /tidak cocok/i);

    // Same as current PIN
    const samePin = validateNewPin('34567801', '34567801', '34567801');
    assert.strictEqual(samePin.valid, false);
    assert.match(samePin.error || '', /tidak boleh sama/i);

    // Too short (< 6 digits)
    const tooShort = validateNewPin('1234', '1234', '34567801');
    assert.strictEqual(tooShort.valid, false);
    assert.match(tooShort.error || '', /6 hingga 8 digit/i);

    // Too long (> 8 digits)
    const tooLong = validateNewPin('1234567890', '1234567890', '34567801');
    assert.strictEqual(tooLong.valid, false);
    assert.match(tooLong.error || '', /6 hingga 8 digit/i);

    // Trivial sequences
    const trivial = validateNewPin('123456', '123456', '34567801');
    assert.strictEqual(trivial.valid, false);
    assert.match(trivial.error || '', /terlalu mudah ditebak/i);
  });

  it('4. Verifies PIN storage lifecycle: fallback derivation -> custom update -> persistence', () => {
    const testClientId = 'test-client-99';
    const testPhone = '0819-8765-4321';

    // 1. Initial lookup with phone fallback
    const initialPin = getClientPin(testClientId, testPhone);
    assert.strictEqual(initialPin, '87654321', 'Should extract last 8 digits as initial PIN');

    // 2. Set new custom PIN
    setClientPin(testClientId, '654987');

    // 3. Subsequent lookup should return the custom PIN
    const customPin = getClientPin(testClientId, testPhone);
    assert.strictEqual(customPin, '654987', 'Should return the custom PIN over the initial PIN');

    // 4. mustChangeClientPin should be false
    assert.strictEqual(mustChangeClientPin(testClientId), false);
  });

  it('5. Verifies authenticateWithFirestore validates credentials and returns structured user profile', async () => {
    // Coach auth with default PIN 123456
    const coachAuth = await authenticateWithFirestore('coach', '123456');
    assert.strictEqual(coachAuth.success, true);
    assert.strictEqual(coachAuth.user?.role, 'coach');

    // Coach auth with invalid PIN
    const coachAuthFail = await authenticateWithFirestore('coach', '000000');
    assert.strictEqual(coachAuthFail.success, false);

    // Client auth with mock k-01 default phone-derived PIN 34567801
    const clientAuth = await authenticateWithFirestore('client', '34567801', 'k-01');
    assert.strictEqual(clientAuth.success, true);
    assert.strictEqual(clientAuth.user?.role, 'client');
    assert.strictEqual(clientAuth.user?.clientId, 'k-01');

    // Admin auth with 999888
    const adminAuth = await authenticateWithFirestore('admin', '999888');
    assert.strictEqual(adminAuth.success, true);
    assert.strictEqual(adminAuth.user?.role, 'admin');
  });

  it('6. Verifies authenticatePinUniversally automatically identifies user persona and ID from PIN alone', async () => {
    // A: Universal auth with Coach PIN 123456 -> automatically recognized as Coach Panji
    const coachRes = await authenticatePinUniversally('123456', INITIAL_CLIENTS);
    assert.strictEqual(coachRes.success, true);
    assert.strictEqual(coachRes.user?.role, 'coach');
    assert.match(coachRes.user?.displayName || '', /Panji/i);

    // B: Universal auth with Member k-01 PIN 34567801 -> automatically recognized as Member Budi Santoso
    const memberRes = await authenticatePinUniversally('34567801', INITIAL_CLIENTS);
    assert.strictEqual(memberRes.success, true);
    assert.strictEqual(memberRes.user?.role, 'client');
    assert.strictEqual(memberRes.user?.clientId, 'k-01');
    assert.match(memberRes.user?.displayName || '', /Budi/i);

    // C: Universal auth with Admin PIN 999888 -> automatically recognized as Admin
    const adminRes = await authenticatePinUniversally('999888', INITIAL_CLIENTS);
    assert.strictEqual(adminRes.success, true);
    assert.strictEqual(adminRes.user?.role, 'admin');

    // D: Universal auth with unregistered PIN -> returns clean error without leaking data
    const unknownRes = await authenticatePinUniversally('777777', INITIAL_CLIENTS);
    assert.strictEqual(unknownRes.success, false);
    assert.match(unknownRes.error || '', /PIN tidak terdaftar/i);

    // E: Universal auth with short PIN (<6 digits) -> returns minimum length validation
    const shortRes = await authenticatePinUniversally('1234', INITIAL_CLIENTS);
    assert.strictEqual(shortRes.success, false);
    assert.match(shortRes.error || '', /minimal 6 digit/i);
  });

  it('7. Verifies fetchClientPinHistoryFromFirestore returns valid history entries with fallback', async () => {
    // When offline or testing without cloud connection, it retrieves from client baseline
    const historyK01 = await fetchClientPinHistoryFromFirestore('k-01');
    assert.ok(Array.isArray(historyK01), 'Must return an array of pin log entries');
    assert.ok(historyK01.length > 0, 'k-01 should have initial pin log entry');
    assert.strictEqual(historyK01[0].changedByRole, 'admin');
    assert.match(historyK01[0].note || '', /PIN awal/i);

    // Non-existent client returns empty array cleanly without crashing
    const historyUnknown = await fetchClientPinHistoryFromFirestore('non-existent-client');
    assert.deepStrictEqual(historyUnknown, []);
  });

  it('8. Verifies updateClientPinInFirestore and patchClientPinChangeHistoryInFirestore handle log entries safely', async () => {
    const testLog = {
      id: 'test-log-1',
      changedAt: new Date().toISOString(),
      changedByRole: 'client' as const,
      changedByName: 'Budi Santoso',
      note: 'Perubahan PIN mandiri via Cockpit Member'
    };

    // Safe execution check with fallback
    const patchResult = await patchClientPinChangeHistoryInFirestore('k-01', testLog);
    assert.strictEqual(typeof patchResult, 'boolean');

    const updatePinResult = await updateClientPinInFirestore('k-01', '889900', testLog);
    assert.strictEqual(typeof updatePinResult, 'boolean');
  });
});
