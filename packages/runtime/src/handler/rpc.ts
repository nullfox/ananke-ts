import {
  readdirSync,
} from 'fs';

import {
  basename,
  join,
} from 'path';

import {
  get,
  has,
  isArray,
  isString,
} from 'lodash';

import {
  boomify,
  internal,
  notFound,
  unauthorized,
} from '@hapi/boom';

import * as Joi from 'joi';

import Http from './http';

const methodCache = new Map();

export interface Envelope {
  id: string;
  jsonrpc: string;
  method: string;
  params?: object | Array<any>;
}

export interface Request {
  params: { [key: string]: any };
  envelope: Envelope;
  context: { [key: string]: any };
  headers: { [key: string]: any };
  principalId?: string | number;
  [key: string]: any;
}

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

  static factory(runner: Function, options: object = {}): RPC {
    return new RPC(runner, options);
  }

  async collect(): Promise<Map<string, string>> {
    const result: string | Array<string> = await this.runner();

    if (!methodCache.has(result)) {
      methodCache.set(result, new Map());

      const fileNames: Array<string> = RPC.readFiles(result as string);

      fileNames.forEach((file: string) => {
        methodCache.get(result).set(basename(file.replace(/\.ts|\.js/, '')).slice(1), file);
      });
    }

    return methodCache.get(result);
  }

  async resolveMethod(envelope: Envelope): Promise<Method> {
    const methods = await this.collect();
  
    const path = methods.get(envelope.method);

    if (!path) {
      return {
        runner: (call: any) => (
          RPC.generateResponse(
            call.id,
            notFound(`Method ${envelope.method} does not exist`),
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
    sourceEvent: { [key: string]: any },
  ): Promise<object> {
    // Use the id from the envelope
    const requestId = envelope.id;

    let context: any;

    try {
      context = await this.resolveContext();
    } catch (error) {
      this.logger.error(error);

      return RPC.generateResponse(requestId, internal(`Context could not be resolved: ${error.message}`));
    }

    console.log('=== RESOLVED CONTEXT', context);
    
    // Create a child logger attached to the requestId
    const childLogger = context.Logger.child({ requestId });

    childLogger.debug(
      {
        method: envelope.method,
      },
      'Starting RPC request',
    );

    try {
      const params = await RPC.validateSchema(
        RPC.schemaFromStrings(method.options?.validation),
        envelope.params,
      );

      console.log('=== ABOUT TO REDEUCE MIDDLEWARE', method);

      const request = await this.reduceMiddleware(
        await this.getPreMiddleware(),
        ({
          params,
          envelope,
          headers: sourceEvent.headers,
          context: sourceEvent.requestContext,
        } as Request)
      );

      // If the method requires auth, ensure principalId exists
      if (!!method.options?.requireAuth && !request.principalId) {
        throw unauthorized(`RPC method ${envelope.method} requires authentication`);
      }

      let result = await method.runner(
        (request as Request),
        context,
        sourceEvent,
      );

      result = await this.reduceMiddleware(
        await this.getPostMiddleware(),
        result,
      );

      childLogger.debug(
        {
          method: envelope.method,
        },
        'Finished request successfully',
      );

      return RPC.generateResponse(requestId, result);
    } catch (error) {
      let boomed = boomify(error);

      try {
        boomed = await this.reduceMiddleware(
          await this.getPostMiddleware(),
          boomed,
        );

        boomed = boomify(boomed);
      } catch (middleError) {
        boomed = boomify(middleError);
      }
    
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

      return RPC.generateResponse(requestId, boomed);
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