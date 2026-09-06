import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { EmailProvider, SmsProvider, WhatsAppProvider } from './notifications.contracts';

export interface NotificationInput {
  organizationId: string;
  userId?: string | null;
  type: string;
  channel?: 'in_app' | 'email' | 'sms' | 'whatsapp';
  subject?: string;
  body: string;
  to?: string; // phone/email for sms/email/whatsapp
  data?: Record<string, unknown>;
}

/**
 * Sends a notification through the configured channel adapter and always
 * persists an in-app `Notification` row (so delivery is never lost even if a
 * provider is down). Falls back to the console/manual provider when no real
 * integration is configured.
 */
@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly sms: SmsProvider,
    private readonly email: EmailProvider,
    private readonly whatsapp: WhatsAppProvider,
  ) {}

  async send(input: NotificationInput): Promise<{ ok: boolean; channel: string }> {
    // 1. Always persist the in-app notification.
    await this.prisma.notification.create({
      data: {
        organizationId: input.organizationId,
        userId: input.userId ?? null,
        type: input.type,
        channel: input.channel ?? 'in_app',
        subject: input.subject,
        body: input.body,
        data: input.data as object,
        status: 'SENT',
      },
    }).catch((e: Error) => this.logger.error(`Failed to persist in-app notification: ${e.message}`));

    // 2. Dispatch via the channel adapter (authorised manual entry fallback).
    const channel = input.channel ?? 'in_app';
    try {
      if (channel === 'sms' && input.to) {
        await this.sms.send({ to: input.to, body: input.body, organizationId: input.organizationId });
      } else if (channel === 'email' && input.to) {
        await this.email.send({
          to: input.to,
          subject: input.subject ?? 'Notification',
          html: input.body,
          text: input.body,
          organizationId: input.organizationId,
        });
      } else if (channel === 'whatsapp' && input.to) {
        await this.whatsapp.send({ to: input.to, body: input.body, organizationId: input.organizationId });
      }
    } catch (e) {
      // Provider failure must never block the workflow; log and continue.
      this.logger.warn(`Notification channel "${channel}" failed (${(e as Error).message}); falling back to manual entry.`);
    }

    return { ok: true, channel };
  }
}
