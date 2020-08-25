import {
  join,
} from 'path';

import {
  has,
  mapValues,
} from 'lodash';

import {
  fromString,
} from '../validation';

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

  static requireHandler(path: string, underscoreName: boolean = true): Function | Error {
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

    if (!file.handler) {
      throw new Error(`Helper at ${path} does not export a function called "handler"`);
    }

    return file.handler as Function;
  }

  static factory(context: any, runner: Function, options: Options = {}): Base {
    return new Base(context, runner, options);
  }

  constructor(context: any, runner: Function, options: Options = {}) {
    this.context = context;
    this.runner = runner;
    this.options = options;
  }

  hasErrorHandler(): boolean {
    return !!this.options.onError;
  }

  async requireErrorHandler(): Promise<Function | Error> {
    return Base.requireHandler(this.options.onError!);
  }

  async exec(event: any): Promise<any> {
    throw new Error('Implement in subclass');
  }
}