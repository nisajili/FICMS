/**
 * Shared domain constants: roles, permissions, workflow state machines,
 * and branding-neutral clinic configuration keys.
 *
 * IMPORTANT: nothing here hard-codes a clinic name, country, currency, or logo.
 * Clinic-specific values live in the database (`OrganizationSettings`).
 */

/** White-label configurable keys stored per organization. */
export const BRANDING_KEYS = {
  CLINIC_NAME: 'CLINIC_NAME',
  CLINIC_LOGO: 'CLINIC_LOGO',
  CLINIC_FAVICON: 'CLINIC_FAVICON',
  COUNTRY: 'COUNTRY',
  CURRENCY: 'CURRENCY',
  TIMEZONE: 'TIMEZONE',
  PRIMARY_LANGUAGE: 'PRIMARY_LANGUAGE',
  SECONDARY_LANGUAGE: 'SECONDARY_LANGUAGE',
  PRIMARY_COLOR: 'PRIMARY_COLOR',
  SECONDARY_COLOR: 'SECONDARY_COLOR',
  CLINIC_ADDRESS: 'CLINIC_ADDRESS',
  CLINIC_CONTACTS: 'CLINIC_CONTACTS',
  CLINIC_WEBSITE: 'CLINIC_WEBSITE',
  INVOICE_LAYOUT: 'INVOICE_LAYOUT',
  DATE_FORMAT: 'DATE_FORMAT',
  NUMBER_FORMAT: 'NUMBER_FORMAT',
  WORKING_HOURS: 'WORKING_HOURS',
} as const;

export type BrandingKey = (typeof BRANDING_KEYS)[keyof typeof BRANDING_KEYS];

/** Default role keys. Clinics may extend with custom roles. */
export const ROLES = {
  PLATFORM_ADMIN: 'platform_admin',
  ORG_OWNER: 'org_owner',
  CLINIC_DIRECTOR: 'clinic_director',
  CLINIC_ADMIN: 'clinic_admin',
  SYSTEM_ADMIN: 'system_admin',
  RECEPTIONIST: 'receptionist',
  FERTILITY_SPECIALIST: 'fertility_specialist',
  GENERAL_DOCTOR: 'general_doctor',
  EMBRYOLOGIST: 'embryologist',
  ANDROLOGIST: 'andrologist',
  LAB_SCIENTIST: 'lab_scientist',
  SONOGRAPHER: 'sonographer',
  NURSE: 'nurse',
  PHARMACIST: 'pharmacist',
  COUNSELOR: 'counselor',
  CASHIER: 'cashier',
  FINANCE_OFFICER: 'finance_officer',
  INVENTORY_OFFICER: 'inventory_officer',
  HR_OFFICER: 'hr_officer',
  AUDITOR: 'auditor',
  PATIENT: 'patient',
} as const;

export type RoleKey = (typeof ROLES)[keyof typeof ROLES];

/** Actions used in the permission matrix. */
export const PERMISSIONS = {
  VIEW: 'view',
  VIEW_SELF: 'view_self',
  CREATE: 'create',
  UPDATE: 'update',
  APPROVE: 'approve',
  VERIFY: 'verify',
  RELEASE: 'release',
  CORRECT: 'correct',
  SIGN: 'sign',
  EXPORT: 'export',
  PRINT: 'print',
  ARCHIVE: 'archive',
  CANCEL: 'cancel',
  REFUND: 'refund',
  TRANSFER: 'transfer',
  DISPOSE: 'dispose',
  BREAK_GLASS: 'break_glass',
} as const;

export type PermissionAction =
  (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

/** Resource domains the permission matrix controls. */
export const RESOURCES = {
  PATIENT: 'patient',
  APPOINTMENT: 'appointment',
  MEDICAL_RECORD: 'medical_record',
  CONSULTATION: 'consultation',
  CYCLE: 'cycle',
  SEMEN_ANALYSIS: 'semen_analysis',
  EMBRYO: 'embryo',
  CRYO_TANK: 'cryo_tank',
  ULTRASOUND: 'ultrasound',
  NURSING: 'nursing',
  LAB: 'lab',
  PHARMACY: 'pharmacy',
  INVENTORY: 'inventory',
  BILLING: 'billing',
  PAYMENT: 'payment',
  COUNSELING: 'counseling',
  DONOR: 'donor',
  HR: 'hr',
  ADMIN: 'admin',
  AUDIT: 'audit',
  REPORT: 'report',
} as const;

export type ResourceKey = (typeof RESOURCES)[keyof typeof RESOURCES];

/**
 * Baseline role → permission matrix. Seeded on org creation and used by the
 * permission guard. Represented as `resource:action` strings.
 */
export const DEFAULT_ROLE_PERMISSIONS: Record<RoleKey, string[]> = {
  platform_admin: ['*'],
  org_owner: ['*'],
  clinic_director: ['*'],
  clinic_admin: ['*'],
  system_admin: [
    'admin:*',
    'audit:view',
    'report:view',
    'inventory:view',
    'cryo_tank:view',
  ],
  receptionist: [
    'patient:view',
    'patient:create',
    'patient:update',
    'appointment:view',
    'appointment:create',
    'appointment:update',
    'appointment:cancel',
    'report:view',
  ],
  fertility_specialist: [
    'patient:view',
    'patient:update',
    'medical_record:view',
    'medical_record:create',
    'medical_record:update',
    'consultation:view',
    'consultation:create',
    'consultation:update',
    'consultation:approve',
    'cycle:view',
    'cycle:create',
    'cycle:update',
    'ultrasound:view',
    'ultrasound:create',
    'lab:view',
    'lab:release',
    'billing:view',
  ],
  general_doctor: [
    'patient:view',
    'patient:update',
    'medical_record:view',
    'medical_record:create',
    'medical_record:update',
    'consultation:view',
    'consultation:create',
    'consultation:update',
    'lab:view',
    'lab:release',
  ],
  embryologist: [
    'cycle:view',
    'cycle:update',
    'embryo:view',
    'embryo:create',
    'embryo:update',
    'embryo:approve',
    'cryo_tank:view',
    'cryo_tank:create',
  ],
  andrologist: [
    'semen_analysis:view',
    'semen_analysis:create',
    'semen_analysis:update',
    'semen_analysis:verify',
    'lab:view',
  ],
  lab_scientist: [
    'lab:view',
    'lab:create',
    'lab:update',
    'lab:verify',
    'semen_analysis:view',
    'semen_analysis:create',
    'semen_analysis:update',
  ],
  sonographer: [
    'ultrasound:view',
    'ultrasound:create',
    'ultrasound:update',
    'patient:view',
  ],
  nurse: [
    'patient:view',
    'nursing:view',
    'nursing:create',
    'nursing:update',
    'medical_record:view',
    'appointment:view',
  ],
  pharmacist: [
    'pharmacy:view',
    'pharmacy:create',
    'pharmacy:update',
    'pharmacy:approve',
    'inventory:view',
    'inventory:update',
    'patient:view',
  ],
  counselor: [
    'patient:view',
    'counseling:view',
    'counseling:create',
    'counseling:update',
    'medical_record:view',
  ],
  cashier: [
    'billing:view',
    'billing:create',
    'billing:update',
    'payment:view',
    'payment:create',
    'payment:refund',
    'patient:view',
  ],
  finance_officer: [
    'billing:*',
    'payment:*',
    'report:view',
    'report:export',
    'patient:view',
  ],
  inventory_officer: [
    'inventory:view',
    'inventory:create',
    'inventory:update',
    'inventory:transfer',
    'pharmacy:view',
  ],
  hr_officer: ['hr:view', 'hr:create', 'hr:update', 'audit:view', 'report:view'],
  auditor: ['audit:view', 'audit:export', 'report:view', 'report:export', 'patient:view'],
  patient: [
    'patient:view_self',
    'appointment:view',
    'appointment:create',
    'appointment:update',
    'medical_record:view',
    'billing:view',
  ],
};

/** Workflow state machines. `from → to` transitions are valid. */
export const CYCLE_STATES = [
  'planned',
  'baseline_assessment',
  'stimulation',
  'monitoring',
  'trigger',
  'retrieval',
  'fertilization',
  'embryo_culture',
  'transfer',
  'freezing',
  'luteal_support',
  'pregnancy_test',
  'clinical_pregnancy',
  'outcome',
  'cancelled',
] as const;

export const CYCLE_TRANSITIONS: Record<string, string[]> = {
  PLANNED: ['BASELINE_ASSESSMENT', 'CANCELLED'],
  BASELINE_ASSESSMENT: ['STIMULATION', 'CANCELLED'],
  STIMULATION: ['MONITORING', 'CANCELLED'],
  MONITORING: ['TRIGGER', 'CANCELLED'],
  TRIGGER: ['RETRIEVAL'],
  RETRIEVAL: ['FERTILIZATION'],
  FERTILIZATION: ['EMBRYO_CULTURE'],
  EMBRYO_CULTURE: ['TRANSFER', 'FREEZING', 'CANCELLED'],
  TRANSFER: ['LUTEAL_SUPPORT', 'OUTCOME'],
  FREEZING: ['LUTEAL_SUPPORT', 'OUTCOME'],
  LUTEAL_SUPPORT: ['PREGNANCY_TEST', 'OUTCOME'],
  PREGNANCY_TEST: ['CLINICAL_PREGNANCY', 'OUTCOME'],
  CLINICAL_PREGNANCY: ['OUTCOME'],
  OUTCOME: [],
  CANCELLED: [],
};

export const APPOINTMENT_STATES = [
  'requested',
  'scheduled',
  'checked_in',
  'in_progress',
  'completed',
  'no_show',
  'cancelled',
] as const;

export const APPOINTMENT_TRANSITIONS: Record<string, string[]> = {
  REQUESTED: ['SCHEDULED', 'CANCELLED'],
  SCHEDULED: ['CHECKED_IN', 'CANCELLED', 'NO_SHOW'],
  CHECKED_IN: ['IN_PROGRESS', 'NO_SHOW'],
  IN_PROGRESS: ['COMPLETED'],
  COMPLETED: [],
  NO_SHOW: ['SCHEDULED', 'CANCELLED'],
  CANCELLED: [],
};

export const LAB_RESULT_STATES = [
  'requested',
  'specimen_collected',
  'accessioned',
  'processing',
  'verified',
  'released',
  'invalidated',
] as const;

export const LAB_RESULT_TRANSITIONS: Record<string, string[]> = {
  REQUESTED: ['SPECIMEN_COLLECTED', 'CANCELLED'],
  SPECIMEN_COLLECTED: ['ACCESSED'],
  ACCESSED: ['PROCESSING'],
  PROCESSING: ['VERIFIED'],
  VERIFIED: ['RELEASED'],
  RELEASED: ['INVALIDATED'],
  INVALIDATED: [],
};

/** Default clinic-facing config values (brand-neutral). */
export const DEFAULT_ORG_SETTINGS = {
  clinicName: '',
  currency: '',
  timezone: 'UTC',
  primaryLanguage: 'en',
  primaryColor: '#0f766e',
  secondaryColor: '#0e7490',
  dateFormat: 'YYYY-MM-DD',
  numberFormat: 'en-US',
};
