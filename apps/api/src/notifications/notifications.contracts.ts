/**
 * Provider-independent notification adapters.
 *
 * Each provider implements `NotificationProvider`. The `SmsProvider`,
 * `EmailProvider`, and `WhatsAppProvider` inject these implementations via the
 * `NotificationProviderRegistry`. When a provider is unavailable or
 * unconfigured, the default adapters fall back to "manual"/console logging so
 * the application continues working through authorised manual entry — it never
 * breaks the primary workflow.
 */

export interface SendSmsInput {
  to: string;
  body: string;
  organizationId: string;
}

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text?: string;
  organizationId: string;
}

export interface SendWhatsAppInput {
  to: string;
  body: string;
  organizationId: string;
}

export interface NotificationProvider {
  readonly name: string;
}

export interface SmsProvider extends NotificationProvider {
  send(input: SendSmsInput): Promise<{ ok: boolean; externalRef?: string }>;
}

export interface EmailProvider extends NotificationProvider {
  send(input: SendEmailInput): Promise<{ ok: boolean; externalRef?: string }>;
}

export interface WhatsAppProvider extends NotificationProvider {
  send(input: SendWhatsAppInput): Promise<{ ok: boolean; externalRef?: string }>;
}
