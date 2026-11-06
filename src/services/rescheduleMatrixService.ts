import { ClientProfile, RescheduleRequest } from '../data/mockData';
import { UserRole } from './authGatekeeperService';

export interface ReschedulePolicyEvaluation {
  isLate: boolean;
  hoursUntilSession: number;
  policyType: 'standard_free' | 'late_warning';
  policyTitle: string;
  policyDescription: string;
  quotaImpact: 'none' | 'requires_override';
}

/**
 * Reschedule Approval Matrix — Lead Time Calculation & Policy Evaluation
 * Evaluates whether a reschedule request is made >= 24 hours prior (free) or < 24 hours (late warning).
 */
export function evaluateReschedulePolicy(
  sessionDate: string,
  sessionTime: string,
  requestTimestamp: Date = new Date()
): ReschedulePolicyEvaluation {
  try {
    // Parse scheduled session datetime
    // sessionDate: YYYY-MM-DD, sessionTime: HH:mm (or HH:mm WIB)
    const cleanTime = sessionTime.replace(/\s*WIB/i, '').trim();
    const [hours, minutes] = cleanTime.split(':').map((s) => parseInt(s, 10));
    const sessionDateTime = new Date(`${sessionDate}T${String(hours || 0).padStart(2, '0')}:${String(minutes || 0).padStart(2, '0')}:00`);

    if (isNaN(sessionDateTime.getTime())) {
      return {
        isLate: false,
        hoursUntilSession: 48,
        policyType: 'standard_free',
        policyTitle: 'Kebijakan Standar (>24 Jam)',
        policyDescription: 'Pengajuan jadwal baru bebas penalti kuota.',
        quotaImpact: 'none'
      };
    }

    const diffMs = sessionDateTime.getTime() - requestTimestamp.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    if (diffHours < 24) {
      return {
        isLate: true,
        hoursUntilSession: Math.max(0, Math.round(diffHours * 10) / 10),
        policyType: 'late_warning',
        policyTitle: 'Pengajuan Mepet (<24 Jam)',
        policyDescription:
          'Sesuai SOP Gym, pengajuan kurang dari 24 jam sebelum sesi memerlukan persetujuan dan verifikasi Head Coach / Supervisor.',
        quotaImpact: 'requires_override'
      };
    }

    return {
      isLate: false,
      hoursUntilSession: Math.round(diffHours * 10) / 10,
      policyType: 'standard_free',
      policyTitle: 'Pengajuan Standar (Bebas Kuota)',
      policyDescription:
        'Pengajuan lebih dari 24 jam sebelum jadwal latihan. Kuota sesi PT Anda tetap utuh.',
      quotaImpact: 'none'
    };
  } catch {
    return {
      isLate: false,
      hoursUntilSession: 48,
      policyType: 'standard_free',
      policyTitle: 'Kebijakan Standar',
      policyDescription: 'Pengajuan jadwal baru diproses sesuai ketersediaan slot gym floor.',
      quotaImpact: 'none'
    };
  }
}

/**
 * Reschedule Approval Matrix — Access Control Checks
 */

export function canRequestReschedule(role: UserRole): boolean {
  return role === 'client' || role === 'coach' || role === 'admin';
}

/**
 * Validates whether the active role has clearance to approve a specific reschedule request.
 * - Member CANNOT approve their own reschedule request.
 * - Coach can approve Member requests.
 * - Admin can approve any request (Executive Override).
 * - Member can accept Coach-initiated reschedule proposals.
 */
export function canApproveReschedule(
  role: UserRole,
  request: RescheduleRequest
): boolean {
  if (role === 'admin') {
    return true; // Admin has operational supervisory override
  }

  if (role === 'coach') {
    // Coach can approve member-initiated requests
    return request.requestedByRole === 'client';
  }

  if (role === 'client') {
    // Member cannot approve their own request!
    if (request.requestedByRole === 'client') {
      return false;
    }
    // Member can approve if Coach proposed the change to them
    return request.requestedByRole === 'coach';
  }

  return false;
}

/**
 * Validates whether the active role can reject a reschedule request.
 */
export function canRejectReschedule(
  role: UserRole,
  request: RescheduleRequest
): boolean {
  return canApproveReschedule(role, request);
}

/**
 * Validates whether the active role can cancel a pending reschedule request.
 * Only the original requester or Admin can cancel before a decision is reached.
 */
export function canCancelReschedule(
  role: UserRole,
  request: RescheduleRequest
): boolean {
  if (role === 'admin') return true;
  return role === request.requestedByRole;
}

/**
 * Creates a structured RescheduleRequest applying the lead time policy.
 */
export function createRescheduleRequest(params: {
  client: ClientProfile;
  proposedDate: string;
  proposedTime: string;
  proposedLocation: 'Gym Utama Senayan' | 'SCBD District 8' | 'Private Studio Kemang';
  reason: string;
  requestedByRole: 'client' | 'coach' | 'admin';
  requestedByName: string;
}): RescheduleRequest {
  const { client, proposedDate, proposedTime, proposedLocation, reason, requestedByRole, requestedByName } = params;
  const policy = evaluateReschedulePolicy(client.nextSession.date, client.nextSession.time);

  return {
    id: `rsch-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    clientId: client.id,
    clientName: client.nama_lengkap,
    clientPhone: client.telepon,
    originalDate: client.nextSession.date,
    originalTime: client.nextSession.time,
    originalLocation: client.nextSession.location,
    proposedDate,
    proposedTime,
    proposedLocation,
    reason,
    requestedAt: new Date().toISOString(),
    requestedByRole,
    requestedByName,
    status: 'pending',
    isLateRequest: policy.isLate,
    hoursLeadTime: policy.hoursUntilSession
  };
}

/**
 * Processes approval of a reschedule request according to the approval matrix.
 * - Updates client.nextSession with proposed schedule
 * - Clears pendingReschedule
 * - Appends to rescheduleHistory
 */
export function processApproveReschedule(params: {
  client: ClientProfile;
  request: RescheduleRequest;
  approverRole: UserRole;
  approverName: string;
  decisionNote?: string;
}): { updatedClient: ClientProfile; approvedRequest: RescheduleRequest } {
  const { client, request, approverRole, approverName, decisionNote } = params;

  if (!canApproveReschedule(approverRole, request)) {
    throw new Error(`Role ${approverRole} tidak memiliki otorisasi untuk menyetujui permohonan reschedule ini.`);
  }

  const approvedRequest: RescheduleRequest = {
    ...request,
    status: 'approved',
    decidedAt: new Date().toISOString(),
    decidedByRole: approverRole,
    decidedByName: approverName,
    decisionNote: decisionNote || 'Disetujui sesuai ketersediaan slot gym floor.'
  };

  const existingHistory = client.rescheduleHistory || [];

  const updatedClient: ClientProfile = {
    ...client,
    nextSession: {
      ...client.nextSession,
      date: request.proposedDate,
      time: request.proposedTime,
      location: request.proposedLocation,
      confirmed: true,
      rescheduleReason: request.reason
    },
    pendingReschedule: undefined,
    rescheduleHistory: [approvedRequest, ...existingHistory.filter((h) => h.id !== request.id)]
  };

  return { updatedClient, approvedRequest };
}

/**
 * Processes rejection of a reschedule request according to the approval matrix.
 * - Retains original client.nextSession
 * - Clears pendingReschedule
 * - Records rejection reason and appends to rescheduleHistory
 */
export function processRejectReschedule(params: {
  client: ClientProfile;
  request: RescheduleRequest;
  rejectorRole: UserRole;
  rejectorName: string;
  reason: string;
}): { updatedClient: ClientProfile; rejectedRequest: RescheduleRequest } {
  const { client, request, rejectorRole, rejectorName, reason } = params;

  if (!canRejectReschedule(rejectorRole, request)) {
    throw new Error(`Role ${rejectorRole} tidak memiliki otorisasi untuk menolak permohonan reschedule ini.`);
  }

  const rejectedRequest: RescheduleRequest = {
    ...request,
    status: 'rejected',
    decidedAt: new Date().toISOString(),
    decidedByRole: rejectorRole,
    decidedByName: rejectorName,
    decisionNote: reason
  };

  const existingHistory = client.rescheduleHistory || [];

  const updatedClient: ClientProfile = {
    ...client,
    pendingReschedule: undefined,
    rescheduleHistory: [rejectedRequest, ...existingHistory.filter((h) => h.id !== request.id)]
  };

  return { updatedClient, rejectedRequest };
}

/**
 * Processes cancellation of a pending reschedule request by the requester.
 */
export function processCancelReschedule(params: {
  client: ClientProfile;
  request: RescheduleRequest;
  cancellerRole: UserRole;
}): { updatedClient: ClientProfile; cancelledRequest: RescheduleRequest } {
  const { client, request, cancellerRole } = params;

  if (!canCancelReschedule(cancellerRole, request)) {
    throw new Error('Hanya pemohon atau Admin yang dapat membatalkan pengajuan reschedule ini.');
  }

  const cancelledRequest: RescheduleRequest = {
    ...request,
    status: 'cancelled',
    decidedAt: new Date().toISOString(),
    decisionNote: 'Dibatalkan oleh pemohon.'
  };

  const existingHistory = client.rescheduleHistory || [];

  const updatedClient: ClientProfile = {
    ...client,
    pendingReschedule: undefined,
    rescheduleHistory: [cancelledRequest, ...existingHistory.filter((h) => h.id !== request.id)]
  };

  return { updatedClient, cancelledRequest };
}
