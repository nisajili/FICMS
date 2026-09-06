import type { SessionUser, DashboardStats, Patient, Appointment, Cycle } from '@ficms/types';
import { api } from './api';

export const auth = {
  login: (email: string, password: string) =>
    api.post<{ requiresMfa: boolean; mfaToken?: string; user?: SessionUser }>('/auth/login', { email, password }),
  me: () => api.get<SessionUser>('/auth/me'),
  logout: () => api.post<{ loggedOut: boolean }>('/auth/logout', {}),
};

export const self = {
  profile: () => api.get<any>('/me'),
  updateProfile: (body: Record<string, unknown>) => api.patch<any>('/me', body),
  appointments: () => api.get<any[]>('/me/appointments'),
  results: () => api.get<any[]>('/me/results'),
  invoices: () => api.get<any[]>('/me/invoices'),
  prescriptions: () => api.get<any[]>('/me/prescriptions'),
  consents: () => api.get<any[]>('/me/consents'),
  consent: (id: string) => api.get<any>(`/me/consents/${id}`),
  signConsent: (id: string) => api.post<any>(`/me/consents/${id}/sign`, {}),
  documents: () => api.get<any[]>('/me/documents'),
  timeline: () => api.get<any[]>('/me/timeline'),
};

export const dashboard = {
  stats: () => api.get<DashboardStats>('/dashboard/stats'),
  today: () => api.get<Appointment[]>('/dashboard/today-appointments'),
};

export const patients = {
  list: (q: { page?: number; pageSize?: number; search?: string }) =>
    api.get<Patient[]>('/patients', q),
  get: (id: string) => api.get<Patient>(`/patients/${id}`),
  create: (body: Record<string, unknown>) => api.post<Patient>('/patients', body),
  update: (id: string, body: Record<string, unknown>) => api.patch<Patient>(`/patients/${id}`, body),
  linkPartner: (id: string, partnerId: string) => api.post(`/patients/${id}/partner`, { partnerId }),
};

export const appointments = {
  list: (q: { page?: number; pageSize?: number; status?: string; patientId?: string }) =>
    api.get<Appointment[]>('/appointments', q),
  create: (body: Record<string, unknown>) => api.post<Appointment>('/appointments', body),
  transition: (id: string, status: string) => api.patch(`/appointments/${id}/status`, { status }),
};

export const cycles = {
  list: (q: { page?: number; pageSize?: number; status?: string; patientId?: string }) =>
    api.get<Cycle[]>('/cycles', q),
  get: (id: string) => api.get<Cycle>(`/cycles/${id}`),
  create: (body: Record<string, unknown>) => api.post<Cycle>('/cycles', body),
  transition: (id: string, status: string) => api.patch(`/cycles/${id}/status`, { status }),
};

export const lab = {
  orders: (q: { page?: number; pageSize?: number; status?: string }) => api.get('/lab/orders', q),
  tests: (q: { page?: number; pageSize?: number }) => api.get('/lab/tests', q),
  createOrder: (body: Record<string, unknown>) => api.post('/lab/orders', body),
  release: (id: string) => api.post(`/lab/orders/${id}/release`, {}),
};

export const billing = {
  invoices: (q: { page?: number; pageSize?: number; status?: string }) => api.get('/billing/invoices', q),
  createInvoice: (body: Record<string, unknown>) => api.post('/billing/invoices', body),
  issue: (id: string) => api.patch(`/billing/invoices/${id}/issue`, {}),
  pay: (id: string, body: Record<string, unknown>) => api.post(`/billing/invoices/${id}/payments`, body),
};

export const cryo = {
  tanks: () => api.get('/cryostorage/tanks'),
};

export const admin = {
  facilities: () => api.get('/facilities'),
  departments: () => api.get('/facilities/departments'),
  createFacility: (body: Record<string, unknown>) => api.post('/facilities', body),
  users: (q: { page?: number; pageSize?: number; search?: string }) => api.get('/users', q),
  inviteUser: (body: Record<string, unknown>) => api.post('/users/invite', body),
  permissions: () => api.get('/organizations/permissions'),

  // Platform-admin organisation management.
  organizations: (q: { page?: number; pageSize?: number; search?: string }) =>
    api.get<any[]>('/organizations', q),
  organization: (id: string) => api.get<any>(`/organizations/${id}`),
  createOrg: (body: Record<string, unknown>) => api.post<any>('/organizations', body),
  setOrgStatus: (id: string, status: string) => api.patch<any>(`/organizations/${id}/status`, { status }),

  // Break-glass emergency access.
  breakGlass: {
    list: (q: { page?: number; pageSize?: number; status?: string; organizationId?: string }) =>
      api.get<any[]>('/admin/break-glass/requests', q),
    request: (body: Record<string, unknown>) => api.post<any>('/admin/break-glass/requests', body),
    approve: (id: string) => api.post<any>(`/admin/break-glass/requests/${id}/approve`, {}),
    revoke: (id: string) => api.post<any>(`/admin/break-glass/requests/${id}/revoke`, {}),
    emergency: (organizationId: string) => api.get<any>(`/admin/break-glass/organizations/${organizationId}/emergency`),
  },

  // Immutable audit trail (platform admins may view across orgs).
  auditEvents: (q: { page?: number; pageSize?: number; action?: string; resourceType?: string }) =>
    api.get<any[]>('/audit/events', q),
};

export const inventory = {
  items: (q: { page?: number; pageSize?: number; search?: string }) => api.get('/inventory/items', q),
  lowStock: () => api.get('/inventory/items/low-stock'),
  create: (body: Record<string, unknown>) => api.post('/inventory/items', body),
};

export const embryology = {
  embryos: (q: { page?: number; pageSize?: number; cycleId?: string; status?: string }) =>
    api.get<any[]>('/embryology/embryos', q),
  create: (body: Record<string, unknown>) => api.post<any>('/embryology/embryos', body),
  observe: (id: string, body: Record<string, unknown>) => api.post<any>(`/embryology/embryos/${id}/observations`, body),
  verifyTransfer: (id: string, body: Record<string, unknown>) => api.post<any>(`/embryology/embryos/${id}/verify-transfer`, body),
  verifyFreeze: (id: string, body: Record<string, unknown>) => api.post<any>(`/embryology/embryos/${id}/verify-freeze`, body),
  setStatus: (id: string, status: string) => api.patch<any>(`/embryology/embryos/${id}/status`, { status }),
};

export const ultrasound = {
  create: (body: Record<string, unknown>) => api.post('/ultrasound/scans', body),
  listForPatient: (patientId: string) => api.get<any[]>(`/ultrasound/patients/${patientId}/scans`),
  verify: (id: string) => api.post(`/ultrasound/scans/${id}/verify`, {}),
};

export const nursing = {
  recordVitals: (body: Record<string, unknown>) => api.post('/nursing/vitals', body),
  listVitals: (patientId: string) => api.get<any[]>(`/nursing/patients/${patientId}/vitals`),
  addNote: (body: Record<string, unknown>) => api.post('/nursing/notes', body),
};

export const counseling = {
  create: (body: Record<string, unknown>) => api.post('/counseling/sessions', body),
  list: (patientId: string) => api.get<any[]>(`/counseling/patients/${patientId}/sessions`),
};

export const donors = {
  list: () => api.get<any[]>('/donors'),
  create: (body: Record<string, unknown>) => api.post<any>('/donors', body),
  setEligibility: (id: string, eligibility: boolean) => api.patch<any>(`/donors/${id}/eligibility`, { eligibility }),
};

export const hr = {
  staff: () => api.get<any[]>('/hr/staff'),
  upsertStaff: (body: Record<string, unknown>) => api.post<any>('/hr/staff', body),
  leave: (q: { status?: string; userId?: string } = {}) => api.get<any[]>('/hr/leave', q),
  submitLeave: (body: Record<string, unknown>) => api.post<any>('/hr/leave', body),
  approveLeave: (id: string, approved: boolean) => api.post<any>(`/hr/leave/${id}/decision`, { approved }),
};

export const reports = {
  cycleOutcomes: (from?: string, to?: string) => api.get<any>('/reports/clinical/cycle-outcomes', { from, to }),
  financial: (from?: string, to?: string) => api.get<any>('/reports/financial/summary', { from, to }),
  operational: (from?: string, to?: string) => api.get<any>('/reports/operational/summary', { from, to }),
  exportClinical: () => api.get<any[]>('/reports/clinical/export'),
};

export const pharmacy = {
  medications: (q: { page?: number; pageSize?: number; search?: string }) => api.get('/pharmacy/medications', q),
  createMedication: (body: Record<string, unknown>) => api.post('/pharmacy/medications', body),
  prescriptions: (q: { page?: number; pageSize?: number; status?: string; patientId?: string }) =>
    api.get<any[]>('/pharmacy/prescriptions', q),
  createPrescription: (body: Record<string, unknown>) => api.post('/pharmacy/prescriptions', body),
  verify: (id: string, verified: boolean) => api.post(`/pharmacy/prescriptions/${id}/verify`, { verified }),
  dispense: (id: string, body: Record<string, unknown>) => api.post(`/pharmacy/prescriptions/${id}/dispense`, body),
};

export const clinicalNotes = {
  list: (q: { page?: number; pageSize?: number; patientId?: string; category?: string }) =>
    api.get<any[]>('/clinical-notes', q),
  get: (id: string) => api.get<any>(`/clinical-notes/${id}`),
  create: (body: Record<string, unknown>) => api.post<any>('/clinical-notes', body),
  sign: (id: string) => api.post<any>(`/clinical-notes/${id}/sign`, {}),
  correct: (id: string, body: Record<string, unknown>) => api.post<any>(`/clinical-notes/${id}/correct`, body),
};
