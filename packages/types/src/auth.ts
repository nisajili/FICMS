/** Auth/session/tenant types shared across web + api. */

export type TenantRole =
  | 'platform_admin'
  | 'org_owner'
  | 'clinic_director'
  | 'clinic_admin'
  | 'system_admin'
  | 'receptionist'
  | 'fertility_specialist'
  | 'general_doctor'
  | 'embryologist'
  | 'andrologist'
  | 'lab_scientist'
  | 'sonographer'
  | 'nurse'
  | 'pharmacist'
  | 'counselor'
  | 'cashier'
  | 'finance_officer'
  | 'inventory_officer'
  | 'hr_officer'
  | 'auditor'
  | 'patient';

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: TenantRole;
  organizationId: string | null;
  facilityId: string | null;
  departmentId: string | null;
  permissions: string[];
  isPlatformAdmin: boolean;
  isPatient: boolean;
  mfaEnabled: boolean;
  // patient linkage
  patientId?: string | null;
}

export interface AccessTokenPayload {
  sub: string;
  email: string;
  org: string | null;
  fac: string | null;
  role: TenantRole;
  type: 'access';
  iat: number;
  exp: number;
}

export interface RefreshTokenPayload {
  sub: string;
  type: 'refresh';
  sid: string;
  iat: number;
  exp: number;
}

export interface LoginResult {
  user: SessionUser;
  accessToken: string;
  refreshToken?: string;
  requiresMfa: boolean;
  mfaToken?: string;
}

export interface LoginResponse {
  user: SessionUser;
  requiresMfa: boolean;
  mfaToken?: string;
}

export interface TotpSetupResponse {
  secret: string;
  otpauthUrl: string;
  qrCodeDataUrl: string;
}

export interface PermissionContext {
  organizationId: string | null;
  facilityId: string | null;
  departmentId: string | null;
  permissions: string[];
  role: TenantRole;
  isPlatformAdmin: boolean;
}
