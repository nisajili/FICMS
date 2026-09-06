import { NotificationService } from './notification.service';
import { ConsoleSmsProvider, ConsoleEmailProvider, ConsoleWhatsAppProvider } from './console.providers';

const makePrisma = () => {
  const created: unknown[] = [];
  return {
    notification: {
      create: jest.fn(async (d: unknown) => { created.push(d); return d; }),
    },
    __created: () => created,
  };
};

describe('NotificationService', () => {
  it('persists an in-app notification and dispatches via the adapter', async () => {
    const prisma = makePrisma();
    const sms = new ConsoleSmsProvider();
    const email = new ConsoleEmailProvider();
    const whatsapp = new ConsoleWhatsAppProvider();
    const svc = new NotificationService(prisma as any, sms, email, whatsapp);

    const res = await svc.send({
      organizationId: 'org-1',
      userId: 'u-1',
      type: 'appointment_reminder',
      channel: 'sms',
      subject: 'Reminder',
      body: 'You have an appointment tomorrow.',
      to: '+15550001111',
    });

    expect(res.ok).toBe(true);
    expect(res.channel).toBe('sms');
    expect(prisma.__created()).toHaveLength(1);
  });

  it('falls back to manual entry when a provider raises an error', async () => {
    const prisma = makePrisma();
    const broken = {
      name: 'broken',
      send: jest.fn(async () => { throw new Error('provider down'); }),
    };
    const svc = new NotificationService(prisma as any, broken as any, new ConsoleEmailProvider(), new ConsoleWhatsAppProvider());

    const res = await svc.send({
      organizationId: 'org-1',
      type: 'email',
      channel: 'email',
      subject: 'Hello',
      body: 'Body',
      to: 'a@b.c',
    });

    // Never throws; the workflow continues (in-app row persisted).
    expect(res.ok).toBe(true);
    expect(prisma.__created()).toHaveLength(1);
  });
});
