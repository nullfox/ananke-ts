import {
  isString,
} from 'lodash';

import Base from './base';

class Responder {
  body: object | string
  headers: object
  statusCode: number

  constructor(body: object | string, headers: object = {}, statusCode: number = 200) {
    this.body = body;
    this.headers = headers;
    this.statusCode = statusCode;
  }

  getBody() {
    return this.body
  }

  toGateway(): object {
    return {
      statusCode: this.statusCode,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
        ...(this.headers || {}),
      },
      body: isString(this.body) ? this.body : JSON.stringify(this.body),
    };
  }
}

export default class Http extends Base {
  preMiddleware?: Array<Function>;
  postMiddleware?: Array<Function>;

  static factory(runner: Function): Http {
    return new Http(runner);
  }

  async getPreMiddleware(): Promise<Array<Function>> {
    if (!this.preMiddleware) {
      const paths = this.options?.preMiddleware || [];

      this.preMiddleware = await Promise.all(
        paths.map((path) => Base.requireHandler(path)),
      ) as Array<Function>;
    }

    return this.preMiddleware!;
  }

  async getPostMiddleware(): Promise<Array<Function>> {
    if (!this.postMiddleware) {
      const paths = this.options?.postMiddleware || [];

      this.postMiddleware = await Promise.all(
        paths.map((path) => Base.requireHandler(path)),
      ) as Array<Function>;
    }

    return this.postMiddleware!;
  }

  async reduceMiddleware(middleware: Array<Function> = [], object: any, allowErrors: boolean = false): Promise<any> {
    const context = await this.resolveContext();

    let result = object;

    await Promise.all(
      middleware.map(async (fn) => {
        try {
          result = await fn(result, context);
        } catch (error) {
          if (allowErrors) {
            result = error;
          }

          throw error;
        }
      }),
    );

    return result;
  }

  getResponder(payload: object, headers: object = {}, statusCode: number = 200): Responder {
    return new Responder(payload, headers, statusCode);
  }
}

export {
  Responder,
};
