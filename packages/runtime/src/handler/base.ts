import {
  get,
  mapValues,
} from 'lodash';

import {
  fromString,
} from '../validation';

import {
  object,
  Schema,
} from '@hapi/joi';

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