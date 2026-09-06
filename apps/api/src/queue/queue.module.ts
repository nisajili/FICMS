import { Global, Module } from '@nestjs/common';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { NotificationsQueueService } from './queue.service';

export const NOTIFICATIONS_QUEUE = 'notifications';

/**
 * Global BullMQ queue for background tasks (reminders, notifications, report
 * generation). The `apps/worker` process consumes these jobs. Falls back to
 * writing a `Notification` row directly when Redis is unavailable.
 */
@Global()
@Module({
  providers: [
    {
      provide: 'REDIS_CONNECTION',
      useFactory: () => {
        const url = process.env.REDIS_URL ?? 'redis://localhost:6379';
        return new IORedis(url, { maxRetriesPerRequest: null });
      },
    },
    {
      provide: 'NOTIFICATIONS_QUEUE',
      inject: ['REDIS_CONNECTION'],
      useFactory: (connection: IORedis) =>
        new Queue(NOTIFICATIONS_QUEUE, { connection, defaultJobOptions: { attempts: 3, backoff: { type: 'exponential', delay: 5000 }, removeOnComplete: 100, removeOnFail: 500 } }),
    },
    NotificationsQueueService,
  ],
  exports: [NotificationsQueueService, 'NOTIFICATIONS_QUEUE'],
})
export class QueueModule {}
