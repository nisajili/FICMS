/** Domain DTOs shared between the API and the web client. */

export interface Organization {
  id: string;
  name: string;
  slug: string;
  status: 'active' | 'suspended' | 'pending';
  domain: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Facility {
  id: string;
  organizationId: string;
  name: string;
  code: string;
  address: string | null;
  phone: string | null;
  timezone: string | null;
  status: 'active' | 'closed';
}

export interface Department {
  id: string;
  organizationId: string;
  facilityId: string | null;
  name: string;
  code: string;
}

export interface UserSummary {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
  facilityId: string | null;
  lastLoginAt: string | null;
}

export interface Patient {
  id: string;
  medicalRecordNumber: string;
  givenName: string;
  familyName: string;
  dateOfBirth: string | null;
  sex: 'female' | 'male' | 'other' | 'unknown';
  email: string | null;
  phone: string | null;
  status: 'active' | 'archived' | 'deceased';
  createdAt: string;
  updatedAt: string;
}

export interface Partner {
  id: string;
  patientId: string;
  partnerId: string;
  relationshipType: string;
  active: boolean;
}

export interface Appointment {
  id: string;
  code: string;
  patientId: string;
  practitionerId: string | null;
  facilityId: string | null;
  scheduledStart: string;
  scheduledEnd: string;
  status: 'requested' | 'scheduled' | 'checked_in' | 'in_progress' | 'completed' | 'no_show' | 'cancelled';
  serviceType: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Cycle {
  id: string;
  cycleNumber: string;
  patientId: string;
  partnerId: string | null;
  treatmentType: 'ivf' | 'icsi' | 'iui' | 'other';
  protocolTemplate: string | null;
  status: string;
  startedAt: string | null;
  triggeredAt: string | null;
  retrievalAt: string | null;
  transferAt: string | null;
  outcome: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  patientId: string;
  status: 'draft' | 'issued' | 'partially_paid' | 'paid' | 'cancelled' | 'refunded';
  currency: string;
  dueDate: string | null;
  subtotal: number;
  taxTotal: number;
  total: number;
  amountPaid: number;
  amountDue: number;
  createdAt: string;
  updatedAt: string;
}

export interface Invite {
  email: string;
  role: string;
  name?: string;
  facilityId?: string | null;
}

export interface DashboardStats {
  patients: number;
  appointmentsToday: number;
  activeCycles: number;
  outstandingBalance: number;
  pendingLabResults: number;
}
