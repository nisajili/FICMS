import { Worker, QueueEvents } from 'bullmq';
import IORedis from 'ioredis';
import { PrismaClient } from '@prisma/client';

const connection = new IORedis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

const prisma = new PrismaClient();

async function deliver(job: { name: string; data: Record<string, unknown> }) {
  const { organizationId, appointmentId, userId, type, subject, body, channel, data } = job.data as Record<string, any>;

  // In-app notification is already persisted by the API for most jobs. For
  // reminder-type jobs we ensure a notification row exists.
  if (userId) {
    await prisma.notification
      .updateMany({
        where: { userId, type, data: JSON.parse(JSON.stringify(data ?? {})) },
        data: { status: 'SENT' },
      })
      .catch(() => undefined);
  }

  if (job.name === 'appointment_reminder' && appointmentId) {
    await prisma.notification.create({
      data: {
        organizationId,
        userId: null,
        type: 'appointment_reminder',
        channel: channel ?? 'in_app',
        subject: subject ?? 'Upcoming appointment',
        body: body ?? 'You have an upcoming appointment.',
        data: { appointmentId, sentAt: new Date().toISOString() },
        status: 'SENT',
      },
    }).catch((e: Error) => console.warn('Reminder write failed:', e.message));
  }

  console.log(`[worker] processed ${job.name}`);
  return { ok: true };
}

async function start() {
  const worker = new Worker('notifications', deliver, {
    connection,
    concurrency: 10,
  });

  worker.on('failed', (job, err) => {
    console.error(`[worker] job ${job?.id ?? '?'} failed: ${err.message}`);
  });
  worker.on('completed', (job) => console.log(`[worker] job ${job?.id ?? '?'} completed`));

  try {
    await new QueueEvents('notifications', { connection }).waitUntilReady();
  } catch (e) {
    console.warn('[worker] QueueEvents ready check skipped:', (e as Error).message);
  }

  console.log('[worker] FICMS background worker listening on queue "notifications"');
  console.log('[worker] Health: worker is ready to process jobs.');
}

start().catch((e) => {
  console.error('Worker failed to start:', e);
  process.exit(1);
});
