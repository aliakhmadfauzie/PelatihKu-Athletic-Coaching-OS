import { NotificationJobData, MulticastBatchResult } from './types';

export type JobProcessor = (job: NotificationJobData) => Promise<MulticastBatchResult>;

export interface IAsyncNotificationQueue {
  enqueue(data: NotificationJobData): Promise<{ jobId: string; status: 'enqueued' }>;
  process(handler: JobProcessor): void;
  getJobCount(): number;
  drain(): Promise<void>;
}

/**
 * Resilient decoupled background job queue.
 * Guarantees that HTTP request loops never block on FCM/APNs network latency.
 * Implements retry backoff (up to 3 attempts) and non-blocking event-driven execution.
 */
export class MemoryAsyncNotificationQueue implements IAsyncNotificationQueue {
  private queue: NotificationJobData[] = [];
  private isProcessing = false;
  private processor?: JobProcessor;
  private inFlightJobs: Promise<any>[] = [];

  constructor(private readonly maxRetries: number = 3) {}

  async enqueue(data: NotificationJobData): Promise<{ jobId: string; status: 'enqueued' }> {
    this.queue.push({ ...data, attempt: 1 });
    // Trigger processor asynchronously on next event loop tick
    setImmediate(() => this.processNext());
    return { jobId: data.jobId, status: 'enqueued' };
  }

  process(handler: JobProcessor): void {
    this.processor = handler;
    setImmediate(() => this.processNext());
  }

  getJobCount(): number {
    return this.queue.length;
  }

  private async processNext(): Promise<void> {
    if (this.isProcessing || !this.processor || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;
    const job = this.queue.shift();

    if (!job) {
      this.isProcessing = false;
      return;
    }

    const jobPromise = (async () => {
      try {
        await this.processor!(job);
      } catch (err) {
        console.error(`[NotificationQueue] Job ${job.jobId} failed on attempt ${job.attempt}:`, err);
        const currentAttempt = job.attempt || 1;
        if (currentAttempt < this.maxRetries) {
          // Exponential backoff
          const delayMs = Math.pow(2, currentAttempt) * 100;
          setTimeout(() => {
            this.queue.push({ ...job, attempt: currentAttempt + 1 });
            this.processNext();
          }, delayMs);
        } else {
          console.error(`[NotificationQueue] Job ${job.jobId} permanently failed after ${this.maxRetries} attempts.`);
        }
      } finally {
        this.isProcessing = false;
        if (this.queue.length > 0) {
          setImmediate(() => this.processNext());
        }
      }
    })();

    this.inFlightJobs.push(jobPromise);
    await jobPromise;
  }

  async drain(): Promise<void> {
    while (this.queue.length > 0 || this.isProcessing) {
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    await Promise.allSettled(this.inFlightJobs);
  }
}
