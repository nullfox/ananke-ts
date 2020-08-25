import {
  v4,
} from 'uuid';

import {
  get,
  has,
} from 'lodash';

import {
  Boom,
  boomify,
  internal,
  unauthorized,
} from '@hapi/boom';

import Http from './http';

export interface Request {
  payload?: { [key: string]: any };
  params?: { [key: string]: any };
  query?: { [key: string]: any };
  context: { [key: string]: any };
  principalId?: string;
}

interface GeneratedResponse {
  payload: object;
  headers?: object;
  statusCode: number
}

export default class REST extends Http {
  static generateResponse(result: object | Boom): GeneratedResponse {
    if (result instanceof Error) {
      return (result as Boom).output;
    }

    return {
      statusCode: 200,
      payload: result,
    };
  }

  static factory(context: any, runner: Function, options: object = {}): REST {
    return new REST(context, runner, options);
  }

  async exec(event: any): Promise<any> {
    const requestId = v4();

    // Create a child logger attached to the requestId
    const childLogger = this.context.Logger.child({ requestId });

    childLogger.debug(
      {
        path: event.path,
        method: event.httpMethod,
      },
      'Starting REST request',
    );

    try {
      const payload = await REST.validateSchema(
        REST.schemaFromStrings(this.options?.validation),
        JSON.parse(event.body),
      );

      // Resolve a principal id if we've supplied an authenticator
      let principalId;

      if (this.options?.authenticator && has(event, 'headers.Authorization')) {
        principalId = await this.resolvePrincipalId(
          this.options!.authenticator!,
          get(event, 'headers.Authorization'),
          event,
        );
      }

      // If the method requires auth, ensure principalId exists
      if (!!this.options?.auth && !principalId) {
        if (!this.options?.authenticator) {
          throw internal('REST endpoint is requiring authentication but no authenticator has been setup');
        }

        throw unauthorized(`REST endpoint ${event.httpMethod.toUpperCase()} ${event.path} requires authentication`);
      }

      const result = await this.runner(
        ({
          principalId,
          payload,
          context: event.requestContext,
        } as Request),
        this.context,
        event,
      );

      const response = REST.generateResponse(result);

      return this.getResponder(
        response.payload,
        {},
        response.statusCode,
      );
    } catch (error) {
      let boomed = boomify(error);

      if (this.hasErrorHandler()) {
        const errorHandler = await this.requireErrorHandler() as Function;

        boomed = await errorHandler(boomed, this.context);
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

      const response = REST.generateResponse(boomed);

      return this.getResponder(
        response.payload,
        response.headers,
        response.statusCode,
      );
    }
  }
}