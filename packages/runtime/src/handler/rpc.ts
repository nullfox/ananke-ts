import {
  readdirSync,
} from 'fs';

import {
  basename,
  join,
} from 'path';

import {
  isArray,
  isString,
} from 'lodash';

import {
  boomify,
  notFound,
} from '@hapi/boom';

import * as Joi from '@hapi/joi';

import Http from './http';

const methodCache = new Map();

export default class RPC extends Http {
  static readFiles(path: string): Array<string> {
    return readdirSync(path)
      .filter((file: string) => file.startsWith('_'))
      .map(file => join(path, file));
  }

  static getEnvelopeSchema(): Joi.Schema {
    return Joi.object({
      id: Joi.string().uuid().required(),
      jsonrpc: Joi.string().valid('2.0').required(),
      method: Joi.string().required(),
      params: Joi.alternatives(
        Joi.array(),
        Joi.object(),
      ),
    });
  }

  static generateResponse(id: string, result: object | Error): object {
    const payload: { [key: string]: any } = {
      id,
      jsonrpc: '2.0',
    };

    if (result instanceof Error) {
      payload.error = {
        // @ts-ignore
        code: result.output.statusCode,
        // @ts-ignore
        message: result.output.payload.message,
      };
    } else {
      payload.result = result;
    }

    return payload;
  }

  static factory(context: any, runner: Function, options: object = {}): RPC {
    return new RPC(context, runner, options);
  }

  async collect(): Promise<Map<string, string>> {
    if (methodCache.size === 0) {
      const result: string | Array<string> = await this.runner();

      const fileNames: Array<string> = isString(result) ? RPC.readFiles(result) : result;

      fileNames.forEach((file: string) => {
        methodCache.set(basename(file.replace(/\.ts|\.js/, '')).slice(1), file);
      });
    }

    return methodCache;
  }

  async resolveMethod(envelope: Envelope): Promise<Method> {
    const methods = await this.collect();
  
    const path = methods.get(envelope.method);

    if (!path) {
      return {
        runner: (call: any) => (
          RPC.generateResponse(
            call.id,
            notFound(`Method ${call.method} does not exist`),
          )
        ),
      };
    }

    const file = require(path);

    return {
      runner: file.runner,
      options: file.options,
    };
  }

  async callMethod(
    method: Method,
    envelope: Envelope,
    context: { [key: string]: any },
    sourceEvent: { [key: string]: any },
  ): Promise<object> {
    // Use the id from the envelope
    const requestId = envelope.id;

    // Create a child logger attached to the requestId
    const childLogger = context.Logger.child({ requestId });

    childLogger.debug(
      {
        method: envelope.method,
      }, 'Starting RPC request',
    );

    try {
      const params = await RPC.validateSchema(
        RPC.schemaFromStrings(method.options?.validation),
        envelope.params,
      );

      const result = await method.runner(
        {
          // principalId,
          params,
          envelope,
          context: sourceEvent.requestContext,
        },
        this.context,
        sourceEvent,
      );

      return RPC.generateResponse(requestId, result);
    } catch (error) {
      const boomed = boomify(error);
    
      if (boomed.isServer) {
        childLogger.error(
          { err: boomed },
          'Finished request with server error',
        );
      } else {
        childLogger.debug(
          { err: boomed },
          'Finished request with client error',
        );
      }

      return RPC.generateResponse(requestId, error);
    }
  }

  async exec(event: any): Promise<any> {
    const envelope: object = await RPC.validateSchema(
      Joi.alternatives().try(
        RPC.getEnvelopeSchema(),
        Joi.array().items(RPC.getEnvelopeSchema()),
      ),
      JSON.parse(event.body),
    );

    const envelopes: Array<Envelope> = isArray(envelope) ? envelope : [envelope];

    const results: Array<object> = await Promise.all(
      envelopes.map(async (envelope: Envelope) => {
        const method = await this.resolveMethod(envelope);

        return this.callMethod(
          method,
          envelope,
          this.context,
          event,
        );
      })
    );

    if (results.length === 1) {
      return this.getResponder(results.shift()!);
    }

    return this.getResponder(results);
  }
}