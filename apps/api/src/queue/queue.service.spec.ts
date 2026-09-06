import { NotificationsQueueService } from './queue.service';

type Ctx = { queue?: any; prisma?: any };

function makeService(overrides: Ctx = {}) {
  const queue = overrides.queue ?? { add: jest.fn().mockResolvedValue(undefined) };
  const prisma =
    overrides.prisma ??
    (() => {
      const base = {
        notification: {
          create: jest.fn().mockImplementation(({ data }: any) => Promise.resolve({ id: 'n1', ...data })),
        },
      };
      return base;
    })();
  const service = new NotificationsQueueService(queue as any, prisma as any);
  return { service, queue, prisma };
}

describe('NotificationsQueueService', () => {
  it('persists an in-app notification row and enqueues the job', async () => {
    const { service, queue, prisma } = makeService();
    await service.enqueue({ organizationId: 'org-1', userId: 'u1', type: 'appointment.reminder', subject: 'Reminder', body: 'You have an appointment', channel: 'in_app' });
    expect(prisma.notification.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ organizationId: 'org-1', userId: 'u1', type: 'appointment.reminder', status: 'QUEUED' }),
    });
    expect(queue.add).toHaveBeenCalledWith(
      'appointment.reminder',
      expect.objectContaining({ organizationId: 'org-1', userId: 'u1' }),
      expect.any(Object),
    );
  });

  it('does not fail the workflow when the queue is unavailable', async () => {
    const { service, queue, prisma } = makeService();
    queue.add.mockRejectedValue(new Error('redis down'));
    await expect(
      service.enqueue({ organizationId: 'org-1', type: 'manual', subject: 'x', body: 'y' }),
    ).resolves.toBeUndefined();
    // The in-app row is still persisted.
    expect(prisma.notification.create).toHaveBeenCalled();
  });

  it('schedules an appointment reminder with the computed delay', async () => {
    const { service, queue } = makeService();
    const remindAt = new Date(Date.now() + 60_000);
    await service.scheduleAppointmentReminder('org-1', 'a1', remindAt);
    expect(queue.add).toHaveBeenCalledWith(
      'appointment_reminder',
      { organizationId: 'org-1', appointmentId: 'a1' },
      expect.objectContaining({ delay: expect.any(Number) }),
    );
  });
});
