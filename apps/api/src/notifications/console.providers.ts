import { Injectable, Logger } from '@nestjs/common';
import type { EmailProvider, SendEmailInput, SendSmsInput, SendWhatsAppInput, SmsProvider, WhatsAppProvider } from './notifications.contracts';

/**
 * Default "manual/console" adapters. These never fail because a real
 * provider is unconfigured — the message is logged for staff to send
 * manually (the "authorised manual entry" path required by the spec).
 */
@Injectable()
export class ConsoleSmsProvider implements SmsProvider {
  readonly name = 'console';
  private readonly logger = new Logger('SmsProvider');

  async send(input: SendSmsInput) {
    this.logger.log(`[SYNTH SMS] to=${input.to} org=${input.organizationId} body=${input.body}`);
    return { ok: true, externalRef: `console-${Date.now()}` };
  }
}

@Injectable()
export class ConsoleEmailProvider implements EmailProvider {
  readonly name = 'console';
  private readonly logger = new Logger('EmailProvider');

  async send(input: SendEmailInput) {
    this.logger.log(`[SYNTH EMAIL] to=${input.to} org=${input.organizationId} subject=${input.subject}`);
    return { ok: true, externalRef: `console-${Date.now()}` };
  }
}

@Injectable()
export class ConsoleWhatsAppProvider implements WhatsAppProvider {
  readonly name = 'console';
  private readonly logger = new Logger('WhatsAppProvider');

  async send(input: SendWhatsAppInput) {
    this.logger.log(`[SYNTH WHATSAPP] to=${input.to} org=${input.organizationId} body=${input.body}`);
    return { ok: true, externalRef: `console-${Date.now()}` };
  }
}
