import { Module } from '@nestjs/common';
import { ConsoleSmsProvider, ConsoleEmailProvider, ConsoleWhatsAppProvider } from './console.providers';
import { NotificationService } from './notification.service';

/**
 * Notification adapters. Real providers (Twilio, SendGrid, WhatsApp Business,
 * etc.) implement the contracts and are wired via DI + env secrets. The
 * console providers are the safe default when integrations are unavailable.
 */
@Module({
  providers: [
    NotificationService,
    ConsoleSmsProvider,
    ConsoleEmailProvider,
    ConsoleWhatsAppProvider,
  ],
  exports: [NotificationService, ConsoleSmsProvider, ConsoleEmailProvider, ConsoleWhatsAppProvider],
})
export class NotificationsModule {}
