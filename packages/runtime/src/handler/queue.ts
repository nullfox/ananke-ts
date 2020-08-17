import {
  SQS,
} from 'aws-sdk';

import Base from './base';

interface SQSRecord {
  eventSourceARN: string,
  receiptHandle: string,
}

class Helper {
  sqs: SQS
  record: SQSRecord

  static factory(sqs: SQS, record: SQSRecord): Helper {
    return new Helper(sqs, record);
  }

  constructor(sqs: SQS, record: SQSRecord) {
    this.sqs = sqs;
    this.record = record;
  }

  async getUrl(): Promise<string> {
    const response = await this.sqs.getQueueUrl({
      QueueName: this.record.eventSourceARN.split(':').pop()!,
    })
      .promise();

    return response.QueueUrl!;
  }

  async delete(): Promise<any> {
    const url = await this.getUrl();

    return this.sqs.deleteMessage({
      QueueUrl: url,
      ReceiptHandle: this.record.receiptHandle,
    })
      .promise();
  }
}

export default class Queue extends Base {
  sqs: SQS

  static factory(context: any, runner: Function, options: Options = {}): Queue {
    return new Queue(context, runner, options);
  }

  constructor(context: any, runner: Function, options: Options = {}) {
    super(context, runner, options);

    this.sqs = new SQS();
  }

  async exec(event: any): Promise<any> {
    return Promise.all(
      event.Records.map(async (message: any) => {
        const data = JSON.parse(message.body);

        const params = await Queue.validateSchema(
          Queue.schemaFromStrings(this.options?.validation),
          data,
        );

        return this.runner(
          params,
          this.context,
          Helper.factory(this.sqs, message),
          message,
          event,
        );
      }),
    );
  }
}
