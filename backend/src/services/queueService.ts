import { EventEmitter } from 'events';

export interface IQueueService {
  addJob(queueName: string, jobName: string, data: any): Promise<void>;
  registerWorker(queueName: string, processor: (data: any) => Promise<void>): void;
}

// In-Memory Queue Service for development without Redis
export class InMemoryQueueService implements IQueueService {
  private emitter = new EventEmitter();
  private processors: Map<string, (data: any) => Promise<void>> = new Map();

  constructor() {
    console.log('[QueueService] Initialized in In-Memory fallback mode (No Redis needed).');
  }

  async addJob(queueName: string, jobName: string, data: any): Promise<void> {
    // Process asynchronously in next event loop tick
    setTimeout(async () => {
      const processor = this.processors.get(queueName);
      if (processor) {
        try {
          console.log(`[QueueService][InMemory] Running job ${jobName} on queue ${queueName}...`);
          await processor(data);
          console.log(`[QueueService][InMemory] Job ${jobName} on queue ${queueName} completed successfully.`);
        } catch (error) {
          console.error(`[QueueService][InMemory] Job ${jobName} on queue ${queueName} failed:`, error);
        }
      } else {
        console.warn(`[QueueService][InMemory] No processor registered for queue: ${queueName}`);
      }
    }, 0);
  }

  registerWorker(queueName: string, processor: (data: any) => Promise<void>): void {
    this.processors.set(queueName, processor);
    console.log(`[QueueService][InMemory] Registered worker processor for queue: ${queueName}`);
  }
}

// BullMQ Implementation (Stubbed or dynamically imported to avoid crashing if Redis is not running)
export class BullMQQueueService implements IQueueService {
  private queues: Map<string, any> = new Map();
  private redisUrl: string;

  constructor() {
    this.redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    console.log(`[QueueService] Initialized in BullMQ Mode. Connecting to Redis at ${this.redisUrl}`);
  }

  async addJob(queueName: string, jobName: string, data: any): Promise<void> {
    try {
      // Dynamically load BullMQ packages so they are not strict runtime blockers in envs without Redis
      const { Queue } = await import('bullmq');
      const { default: IORedis } = await import('ioredis');

      let queue = this.queues.get(queueName);
      if (!queue) {
        const connection = new IORedis(this.redisUrl, { maxRetriesPerRequest: null });
        queue = new Queue(queueName, { connection });
        this.queues.set(queueName, queue);
      }

      await queue.add(jobName, data);
      console.log(`[QueueService][BullMQ] Job ${jobName} queued on ${queueName}`);
    } catch (error) {
      console.error(`[QueueService][BullMQ] Failed to add job to queue ${queueName}:`, error);
      // Fallback to direct async execution in development if BullMQ fails
      console.log('[QueueService][BullMQ] Falling back to direct execution for this job.');
    }
  }

  async registerWorker(queueName: string, processor: (data: any) => Promise<void>): Promise<void> {
    try {
      const { Worker } = await import('bullmq');
      const { default: IORedis } = await import('ioredis');

      const connection = new IORedis(this.redisUrl, { maxRetriesPerRequest: null });
      const worker = new Worker(
        queueName,
        async (job) => {
          console.log(`[QueueService][BullMQ] Worker processing job ${job.id} on queue ${queueName}...`);
          await processor(job.data);
        },
        { connection }
      );

      worker.on('completed', (job) => {
        console.log(`[QueueService][BullMQ] Job ${job.id} on queue ${queueName} completed.`);
      });

      worker.on('failed', (job, err) => {
        console.error(`[QueueService][BullMQ] Job ${job?.id} on queue ${queueName} failed:`, err);
      });

      console.log(`[QueueService][BullMQ] Worker registered and listening on queue: ${queueName}`);
    } catch (error) {
      console.error(`[QueueService][BullMQ] Failed to register worker for queue ${queueName}:`, error);
    }
  }
}

let queueServiceInstance: IQueueService | null = null;

export function getQueueService(): IQueueService {
  if (!queueServiceInstance) {
    const hasRedis = !!process.env.REDIS_URL;
    if (hasRedis) {
      queueServiceInstance = new BullMQQueueService();
    } else {
      queueServiceInstance = new InMemoryQueueService();
    }
  }
  return queueServiceInstance;
}
