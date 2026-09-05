import { Inject, Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';
import { NOTIFICATIONS_QUEUE } from './queue.module';
import { PrismaService } from '../prisma/prisma.service';

export interface NotificationJob {
  organizationId: string;
  userId?: string | null;
  type: string;
  channel?: string;
  subject: string;
  body: string;
  data?: Record<string, unknown>;
}

@Injectable()
export class NotificationsQueueService {
  private readonly logger = new Logger(NotificationsQueueService.name);

  constructor(
    @Inject('NOTIFICATIONS_QUEUE') private readonly queue: Queue,
    private readonly prisma: PrismaService,
  ) {}

  /** Enqueue a notification job; also write an in-app notification row. */
  async enqueue(job: NotificationJob): Promise<void> {
    // Persist an in-app notification (works even if Redis/workers are down).
    await this.prisma.notification.create({
      data: {
        organizationId: job.organizationId,
        userId: job.userId ?? null,
        type: job.type,
        channel: job.channel,
        subject: job.subject,
        body: job.body,
        data: job.data as object,
        status: 'QUEUED',
      },
    }).catch((e) => this.logger.error(`Failed to persist in-app notification: ${e.message}`));

    try {
      await this.queue.add(job.type, job, { jobId: `${job.type}:${job.organizationId}:${Date.now()}` });
    } catch (e) {
      // Integration failure should never block the primary workflow.
      this.logger.warn(`Notification queue unavailable (${(e as Error).message}). Continuing via manual entry.`);
    }
  }

  async scheduleAppointmentReminder(organizationId: string, appointmentId: string, remindAt: Date) {
    try {
      await this.queue.add('appointment_reminder', { organizationId, appointmentId }, { delay: Math.max(0, remindAt.getTime() - Date.now()) });
    } catch (e) {
      this.logger.warn(`Could not schedule reminder (${(e as Error).message}).`);
    }
  }
}
