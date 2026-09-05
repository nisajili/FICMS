import { Injectable, Logger } from '@nestjs/common';
import type { InitiatePaymentInput, InitiatePaymentResult, PaymentProvider } from './payment.contracts';

/**
 * Default offline adapter: recognises a payment that was made outside the
 * system (cash in hand, manual bank transfer) and records it as succeeded.
 * Used when no external payment integration is configured.
 */
@Injectable()
export class OfflinePaymentProvider implements PaymentProvider {
  readonly name = 'offline';
  private readonly logger = new Logger('PaymentProvider');

  async initiate(input: InitiatePaymentInput): Promise<InitiatePaymentResult> {
    this.logger.log(
      `[OFFLINE PAYMENT] invoice=${input.invoiceId} amount=${input.amount} ${input.currency}`,
    );
    return {
      ok: true,
      paymentRef: `offline-${Date.now()}`,
      status: 'succeeded',
      provider: 'offline',
    };
  }
}
