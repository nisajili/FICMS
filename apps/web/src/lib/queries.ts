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
};

export const inventory = {
  items: (q: { page?: number; pageSize?: number; search?: string }) => api.get('/inventory/items', q),
  lowStock: () => api.get('/inventory/items/low-stock'),
  create: (body: Record<string, unknown>) => api.post('/inventory/items', body),
};
