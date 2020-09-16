import {
  join,
  resolve,
} from 'path';

import {
  isFunction,
  map,
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

import Bunyan from 'bunyan';

let contextChain: Promise<any> | null = null;

export default class Base {
  runner: Function
  options: Options
  logger: Bunyan

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

  static requireHandler(path: string, handlerName: string | null = 'handler', underscoreName: boolean = true): Function | Error {
    let fullPath = resolve(
      process.cwd(),
      path,
    );

    if (underscoreName) {
      const pieces = path.split('/');
    
      pieces.push(`_${pieces.pop()}`);

      fullPath = join(
        process.cwd(),
        ...pieces,
      );
    }

    const file = require(fullPath);

    let fn;

    if (!handlerName) {
      fn = file.default || file;
    } else {
      fn = file[handlerName];
    }

    if (!fn) {
      throw new Error(`Helper at ${path} does not export a function`);
    }

    return fn as Function;
  }

  static factory(runner: Function, options: Options = {}): Base {
    return new Base(runner, options);
  }

  constructor(runner: Function, options: Options = {}) {
    this.runner = runner;
    this.options = options;

    this.logger = Bunyan.createLogger({
      name: process.env.SERVICE_NAME || 'unknown',
      serializers: Bunyan.stdSerializers,
      level: (
        process.env.LOG_LEVEL
          ? parseInt(process.env.LOG_LEVEL, 10)
          : 30
      ),
    });
  }

  async resolveContext(): Promise<{ [key: string]: any }> {
    if (!contextChain) {
      // @ts-ignore
      contextChain = Promise.resolve({});

      const context = map(
        this.options.context || {},
        (pathOrFn, key) => (
          {
            key,
            handler: pathOrFn,
          }
        ),
      );
  
      context.unshift({
        key: 'Logger',
        handler: () => this.logger,
      });

      context.forEach(({ key, handler }) => {
        contextChain = contextChain!.then(async (ctx) => {
          if (isFunction(handler)) {
            handler = handler as Function;
          } else {
            handler = Base.requireHandler(handler as string, null, false) as Function;
          }
          
          return Object.assign(
            ctx,
            {
              [key]: await handler(ctx),
            },
          );
        });
      });
    }
  
    return contextChain;
  }

  async exec(event: any): Promise<any> {
    throw new Error('Implement in subclass');
  }
}