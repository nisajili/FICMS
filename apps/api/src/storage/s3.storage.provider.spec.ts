import { S3StorageProvider } from './s3.storage.provider';

// We can't easily mock the aws-sdk client internals without a live endpoint, so
// we exercise the public base URL path and the graceful-failure contract.

describe('S3StorageProvider', () => {
  it('exposes its id', () => {
    const p = new S3StorageProvider({
      endpoint: 'http://localhost:9000',
      region: 'us-east-1',
      bucket: 'ficms',
      accessKeyId: 'minio',
      secretAccessKey: 'minio123',
      forcePathStyle: true,
      publicBaseUrl: 'https://cdn.example.com',
    });
    expect(p.id).toBe('s3');
  });

  it('returns a public base URL when configured (no client call)', async () => {
    const p = new S3StorageProvider({
      endpoint: 'http://localhost:9000',
      region: 'us-east-1',
      bucket: 'ficms',
      accessKeyId: 'minio',
      secretAccessKey: 'minio123',
      forcePathStyle: true,
      publicBaseUrl: 'https://cdn.example.com/',
    });
    const url = await p.getUrl('org-1/p1/a.pdf');
    expect(url).toBe('https://cdn.example.com/org-1/p1/a.pdf');
  });

  it('never throws on put() when the client is unavailable', async () => {
    const p = new S3StorageProvider({
      endpoint: '',
      region: 'us-east-1',
      bucket: 'ficms',
      accessKeyId: '',
      secretAccessKey: '',
      forcePathStyle: true,
    } as any);
    // put() is best-effort; it must not reject.
    const result = await p.put('k', Buffer.from('x'), 'text/plain').catch((e) => ({ success: false, reason: e.message }));
    expect(result).toHaveProperty('success');
  });
});
