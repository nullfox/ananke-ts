import {
  join,
} from 'path';

import {
  mapValues,
} from 'lodash';

import fromString from '../util/joiFromString';

import {
  object,
  Schema,
} from 'joi';

import {
  badRequest,
} from '@hapi/boom';

export default class Base {
  context: any
  runner: Function
  options: Options

  static schemaFromStrings(strings: Validation | undefined): Schema {
    if (!strings) {
      return object({});
    }

    return object(
      mapValues(
        strings,
        val => fromString(val),
      ),
    );
  }

  static validateSchema(schema: Schema, params: object = {}): Promise<object> {
    return new Promise((resolve: Function, reject: Function): void => {
      const result = schema.validate(
        params,
        {
          allowUnknown: true,
          stripUnknown: true,
        },
      );
    
      if (result.error) {
        reject(
          badRequest(
            'One or more parameters are invalid',
            (result.error.details || []).map((d) => d.message),
          ),
        );
      }
    
      resolve(result.value);
    });
  }

  static requireFunction(path: string): Function | Error {
    return require(path) as Function;
  }

  static requireHandler(path: string, handlerName = 'handler', underscoreName: boolean = true): Function | Error {
    let fullPath = path;

    if (underscoreName) {
      const pieces = path.split('/');
    
      pieces.push(`_${pieces.pop()}`);

      fullPath = join(
        process.cwd(),
        ...pieces,
      );
    }

    const file = require(fullPath);

    if (!file[handlerName]) {
      throw new Error(`Helper at ${path} does not export a function called "${handlerName}"`);
    }

    return file[handlerName] as Function;
  }

  static factory(context: any, runner: Function, options: Options = {}): Base {
    return new Base(context, runner, options);
  }

  constructor(context: any, runner: Function, options: Options = {}) {
    this.context = context;
    this.runner = runner;
    this.options = options;
  }

  async exec(event: any): Promise<any> {
    throw new Error('Implement in subclass');
  }
}