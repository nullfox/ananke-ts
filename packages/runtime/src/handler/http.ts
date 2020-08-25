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
  static factory(context: any, runner: Function): Http {
    return new Http(context, runner);
  }

  getResponder(payload: object, headers: object = {}, statusCode: number = 200): Responder {
    return new Responder(payload, headers, statusCode);
  }

  async resolvePrincipalId(
    authenticatorPath: string,
    authorizationHeader: string,
    sourceEvent: { [key: string]: any }
  ): Promise<string | undefined> {
    const authenticator = await Http.requireHandler(authenticatorPath) as Function;

    return authenticator(
      authorizationHeader,
      this.context,
      sourceEvent,
    );
  }
}

export {
  Responder,
};
