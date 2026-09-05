import { Module } from '@nestjs/common';
import { OfflinePaymentProvider } from './offline.payment.provider';

/**
 * Payment adapter module. Real providers (M-Pesa, Stripe, card acquirers,
 * insurance gateways) implement `PaymentProvider` and are registered here via
 * DI + env secrets. Offline is the safe default for authorised manual entry.
 */
@Module({
  providers: [OfflinePaymentProvider],
  exports: [OfflinePaymentProvider],
})
export class PaymentsModule {}
