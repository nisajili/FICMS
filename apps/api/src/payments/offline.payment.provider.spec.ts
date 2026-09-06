import { OfflinePaymentProvider } from './offline.payment.provider';

describe('OfflinePaymentProvider', () => {
  const provider = new OfflinePaymentProvider();

  it('records an offline/external payment as succeeded', async () => {
    const result = await provider.initiate({
      invoiceId: 'inv-1',
      amount: 250,
      currency: 'USD',
      description: 'Consultation',
    });
    expect(result.ok).toBe(true);
    expect(result.status).toBe('succeeded');
    expect(result.provider).toBe('offline');
    expect(result.paymentRef).toBeTruthy();
  });

  it('never throws when the provider is offline (manual entry path works)', async () => {
    await expect(
      provider.initiate({ invoiceId: 'inv-2', amount: 0, currency: 'USD' }),
    ).resolves.toHaveProperty('ok', true);
  });
});
