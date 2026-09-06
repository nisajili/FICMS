/**
 * Provider-independent payment adapters.
 *
 * Each integration (mobile money, card, bank, insurance) implements
 * `PaymentProvider`. The default `OfflinePaymentProvider` records payments as
 * succeeded for authorised manual entry — the system keeps working when a
 * provider integration is unavailable. Real providers are wired via env
 * secrets and signed-webhook handlers; idempotency is enforced by the
 * billing service.
 */

export interface InitiatePaymentInput {
  invoiceId: string;
  amount: number;
  currency: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

export interface InitiatePaymentResult {
  ok: boolean;
  paymentRef?: string;
  status: 'pending' | 'succeeded' | 'failed' | 'requires_action';
  provider?: string;
}

export interface PaymentProvider {
  readonly name: string;
  initiate(input: InitiatePaymentInput): Promise<InitiatePaymentResult>;
}
