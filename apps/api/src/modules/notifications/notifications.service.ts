import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Queue, Worker } from 'bullmq';
import nodemailer, { type Transporter } from 'nodemailer';
import { RedisService } from '../../common/redis.service.js';
import { env } from '../../config.js';
import { renderEmail, type EmailContent } from './email-template.js';

const QUEUE = 'notifications';

/**
 * Outbound messages go through a queue so a slow or failing mail server never
 * blocks a guest's form submission. Retries with backoff.
 */
@Injectable()
export class NotificationsService implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger('Notifications');
  private queue!: Queue;
  private worker!: Worker;
  private transport!: Transporter;

  constructor(private readonly redis: RedisService) {}

  onModuleInit() {
    const connection = this.redis.bullConnection();
    this.queue = new Queue(QUEUE, { connection, defaultJobOptions: { attempts: 5, backoff: { type: 'exponential', delay: 10_000 }, removeOnComplete: 500, removeOnFail: 1000 } });
    this.transport = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
    });
    this.worker = new Worker(
      QUEUE,
      async (job) => {
        if (job.name === 'email') {
          const c = job.data as EmailContent;
          const { html, text } = renderEmail(c);
          await this.transport.sendMail({ from: env.MAIL_FROM, to: c.to, replyTo: c.replyTo, subject: c.subject, html, text });
          this.log.log(`email sent: "${c.subject}" → ${c.to}`);
        }
      },
      { connection, concurrency: 4 },
    );
    this.worker.on('failed', (job, err) => this.log.warn(`job ${job?.id} failed: ${err.message}`));
  }

  async email(content: EmailContent) {
    await this.queue.add('email', content);
  }

  async onModuleDestroy() {
    await this.worker?.close();
    await this.queue?.close();
  }
}
