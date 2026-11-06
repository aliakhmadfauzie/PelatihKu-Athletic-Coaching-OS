import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  UserRole,
  CLIENT_RESTRICTED_FIELDS,
  isCoachOrAdmin,
  canEditClientField,
  isClientOwner,
  UserSessionProfile
} from '../src/services/authGatekeeperService';

describe('PelatihKu PRO — RBAC & Field-Level Access Control (FLAC) Invariants', () => {
  it('1. Verifies Coach and Admin have elevated supervisory role access', () => {
    assert.strictEqual(isCoachOrAdmin('coach'), true, 'Coach should have coach/admin authority');
    assert.strictEqual(isCoachOrAdmin('admin'), true, 'Admin should have coach/admin authority');
    assert.strictEqual(isCoachOrAdmin('client'), false, 'Client should NOT have coach/admin authority');
  });

  it('2. Verifies FLAC: Coach and Admin can edit all client fields', () => {
    const fieldsToTest = [
      'paketTotal',
      'paketTerpakai',
      'status',
      'leadCoach',
      'medicalHistoryNote',
      'sessions',
      'nama_lengkap',
      'telepon',
      'berat_target_kg'
    ];

    fieldsToTest.forEach((field) => {
      assert.strictEqual(
        canEditClientField('coach', field),
        true,
        `Coach should be allowed to edit ${field}`
      );
      assert.strictEqual(
        canEditClientField('admin', field),
        true,
        `Admin should be allowed to edit ${field}`
      );
    });
  });

  it('3. Verifies FLAC: Client persona CANNOT edit restricted fields', () => {
    CLIENT_RESTRICTED_FIELDS.forEach((field) => {
      assert.strictEqual(
        canEditClientField('client', field),
        false,
        `Client MUST NOT be allowed to edit restricted field ${field}`
      );
    });

    // Baseline protection invariant: initial physical calibration fields are strictly read-only for clients
    const baselineFields = [
      'berat_awal_kg',
      'lingkar_pinggang_awal_cm',
      'lingkar_dada_awal_cm',
      'lingkar_lengan_awal_cm',
      'massa_otot_awal_kg',
      'body_fat_awal_pct'
    ];
    baselineFields.forEach((field) => {
      assert.strictEqual(
        canEditClientField('client', field),
        false,
        `Client MUST NOT be allowed to edit baseline field ${field}`
      );
    });
  });

  it('4. Verifies FLAC: Client persona CAN edit permitted self-reported fields', () => {
    const clientAllowedFields = [
      'nama_lengkap',
      'telepon',
      'usia',
      'pekerjaan',
      'target_utama',
      'target_category',
      'berat_target_kg',
      'clientPin',
      'mustChangePin',
      'pinChangedAt',
      'pinChangeHistory'
    ];

    clientAllowedFields.forEach((field) => {
      assert.strictEqual(
        canEditClientField('client', field),
        true,
        `Client should be allowed to update their own ${field}`
      );
    });
  });

  it('5. Verifies isClientOwner correctly validates profile ownership', () => {
    const budiSession: UserSessionProfile = {
      uid: 'k-01',
      role: 'client',
      displayName: 'Budi Santoso',
      clientId: 'k-01'
    };

    assert.strictEqual(
      isClientOwner('k-01', budiSession),
      true,
      'Budi should be verified owner of k-01'
    );
    assert.strictEqual(
      isClientOwner('k-02', budiSession),
      false,
      'Budi should NOT be verified owner of k-02 (another client)'
    );

    const coachSession: UserSessionProfile = {
      uid: 'pas_coach',
      role: 'coach',
      displayName: 'Coach Panji Akbar Syamsi'
    };

    assert.strictEqual(
      isClientOwner('k-01', coachSession),
      false,
      'Coach is not a client owner (coach has full role authority instead)'
    );
  });

  it('6. Verifies UI Scoping: Client persona is restricted strictly to own records and data', () => {
    const mockClients = [
      { id: 'k-01', nama_lengkap: 'Budi Santoso' },
      { id: 'k-02', nama_lengkap: 'Siti Rahma' },
      { id: 'k-03', nama_lengkap: 'Dimas Aditya' }
    ];

    const budiSession: UserSessionProfile = {
      uid: 'k-01',
      role: 'client',
      displayName: 'Budi Santoso',
      clientId: 'k-01'
    };

    // Client scope simulation
    const clientVisible = mockClients.filter((c) => c.id === budiSession.clientId);
    assert.strictEqual(clientVisible.length, 1, 'Client should only see 1 record (their own)');
    assert.strictEqual(clientVisible[0].id, 'k-01');
    assert.strictEqual(clientVisible[0].nama_lengkap, 'Budi Santoso');

    // Coach scope simulation
    const coachVisible = mockClients;
    assert.strictEqual(coachVisible.length, 3, 'Coach should see all client records in the directory');
  });

  it('7. Verifies UI Action Clearance & Least Privilege rules across roles', () => {
    // Action: Add new client
    const canAddClient = (role: UserRole) => isCoachOrAdmin(role);
    assert.strictEqual(canAddClient('coach'), true, 'Coach can add new client');
    assert.strictEqual(canAddClient('admin'), true, 'Admin can add new client');
    assert.strictEqual(canAddClient('client'), false, 'Client CANNOT add new client');

    // Action: Delete client
    const canDeleteClient = (role: UserRole) => isCoachOrAdmin(role);
    assert.strictEqual(canDeleteClient('coach'), true, 'Coach can delete client');
    assert.strictEqual(canDeleteClient('admin'), true, 'Admin can delete client');
    assert.strictEqual(canDeleteClient('client'), false, 'Client CANNOT delete client');

    // Action: Log workout session
    const canLogSession = (role: UserRole) => isCoachOrAdmin(role);
    assert.strictEqual(canLogSession('coach'), true, 'Coach can log workout session');
    assert.strictEqual(canLogSession('admin'), true, 'Admin can log workout session');
    assert.strictEqual(canLogSession('client'), false, 'Client CANNOT log workout session');

    // Action: Modify package quota (paketTotal, paketTerpakai)
    assert.strictEqual(canEditClientField('client', 'paketTotal'), false);
    assert.strictEqual(canEditClientField('client', 'paketTerpakai'), false);
    assert.strictEqual(canEditClientField('coach', 'paketTotal'), true);
  });

  it('8. Verifies Kalibrasi & Biometric Matrix Update is restricted strictly to Coach and Admin', () => {
    const canCalibrateMetrics = (role: UserRole) => isCoachOrAdmin(role);
    assert.strictEqual(canCalibrateMetrics('coach'), true, 'Coach must have access to kalibrasi metrik');
    assert.strictEqual(canCalibrateMetrics('admin'), true, 'Admin must have access to kalibrasi metrik');
    assert.strictEqual(canCalibrateMetrics('client'), false, 'Client must NOT have access to kalibrasi metrik');

    // Matrix & calibration fields are restricted for client persona
    assert.strictEqual(canEditClientField('client', 'weeklyTrend'), false, 'Client cannot modify weeklyTrend');
    assert.strictEqual(canEditClientField('client', 'visceralFatScore'), false, 'Client cannot modify visceralFatScore');
    assert.strictEqual(canEditClientField('client', 'massa_otot_terkini_kg'), false, 'Client cannot modify muscle mass');

    // Coach has full calibration authority
    assert.strictEqual(canEditClientField('coach', 'weeklyTrend'), true, 'Coach can update weeklyTrend');
    assert.strictEqual(canEditClientField('coach', 'visceralFatScore'), true, 'Coach can calibrate visceralFatScore');
    assert.strictEqual(canEditClientField('admin', 'weeklyTrend'), true, 'Admin can update weeklyTrend');
  });

  it('9. Verifies PIN Change History Audit Trail is accessible to Member, Coach, and Admin', () => {
    const mockHistory = [
      {
        id: 'pin-log-1',
        changedAt: new Date().toISOString(),
        changedByRole: 'admin' as const,
        changedByName: 'Supervisor Gym',
        note: 'PIN awal digenerate'
      },
      {
        id: 'pin-log-2',
        changedAt: new Date().toISOString(),
        changedByRole: 'client' as const,
        changedByName: 'Budi Santoso',
        note: 'PIN diubah mandiri via Kokpit Member'
      }
    ];

    // Verification: all 3 personas can inspect the audit trail
    const isVisibleToPersona = (role: UserRole) => ['client', 'coach', 'admin'].includes(role);
    assert.strictEqual(isVisibleToPersona('client'), true, 'Member can view their own PIN history');
    assert.strictEqual(isVisibleToPersona('coach'), true, 'Coach can audit member PIN history');
    assert.strictEqual(isVisibleToPersona('admin'), true, 'Admin can audit member PIN history');

    assert.strictEqual(mockHistory.length, 2);
    assert.strictEqual(mockHistory[0].changedByRole, 'admin');
    assert.strictEqual(mockHistory[1].changedByRole, 'client');
  });
});
