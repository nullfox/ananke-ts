import {
  isString,
} from 'lodash';

import Base from './base';

class Responder {
  body: object | string

  constructor(body: object | string) {
    this.body = body;
  }

  getBody() {
    return this.body
  }

  toGateway(headers: object = {}, statusCode: number = 200): object {
    return {
      statusCode,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
        ...(headers || {}),
      },
      body: isString(this.body) ? this.body : JSON.stringify(this.body),
    };
  }
}

export default class Http extends Base {
  static factory(context: any, runner: Function): Http {
    return new Http(context, runner);
  }

  getResponder(payload: object): Responder {
    return new Responder(payload);
  }
}

export {
  Responder,
};
