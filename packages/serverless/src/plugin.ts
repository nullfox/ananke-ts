import Serverless from 'serverless';

import {
  inspect,
} from 'util';

import {
  ok,
} from 'assert';

import {
  sync,
} from 'glob';

import {
  chain,
  get,
  has,
  isPlainObject,
  set,
} from 'lodash';

import File, { RPC } from './plugin/file';

export enum Key {
  Prefix = 'ananke',

  PsuedoName = 'ananke.psuedoName',

  FunctionSource = 'ananke.function.source',
  Context = 'ananke.function.context',

  HttpPreMiddleware = 'ananke.http.middleware.pre',
  HttpPostMiddleware = 'ananke.http.middleware.post',

  Rpc = 'ananke.rpc',
  RpcPath = 'ananke.rpc.path',
  RpcMethodSource = 'ananke.rpc.methods',
};

export default class Plugin {
  sls: Serverless
  options: Serverless.Options
  hooks: { [key: string]: Function }
  files: Array<File>
  rpc: RPC | undefined

  constructor(sls: Serverless, options: Serverless.Options) {
    this.sls = sls;
    this.options = options;

    this.hooks = {
      'before:package:initialize': this.assemble.bind(this),
      'before:package:createDeploymentArtifacts': this.wrap.bind(this),
      'before:deploy:function:packageFunction': this.wrap.bind(this),
      'before:invoke:local:invoke': this.assembleAndWrap.bind(this),
      'before:offline:start': this.assembleAndWrap.bind(this),
    };

    ok(
      !this.hasCustomValue(Key.Context)
        || (
          this.hasCustomValue(Key.Context)
            && isPlainObject(this.getCustomValue(Key.Context))
        ),
      `${Key.Context} key must be an object containing Key: path/to/file (ex: Database: lib/functions/context/database)`,
    )

    ok(
      this.hasCustomValue(Key.FunctionSource),
      `${Key.FunctionSource} key must be set in serverless.yml (ex: custom.${Key.FunctionSource}: lib/functions)`,
    );

    const files = sync(`${this.getCustomValue(Key.FunctionSource)}/**/*.+(js|ts)`);
    
    this.files = chain(files)
      // All of our files write prepending with _
      .filter(file => !file.split('/').pop()?.startsWith('_'))

      // Ignore TS declaration files
      .filter(file => !file.endsWith('d.ts'))

      // Turn them into File instances
      .map(file => File.factory(file, this))
      .value();

    if (this.hasRpc()) {
      this.rpc = RPC.factory(this);
    }
  }

  hasCustomValue(key: Key): boolean {
    return has(this.sls.service, `custom.${key}`);
  }

  getCustomValue(key: Key, defaultValue?: any): string {
    return get(this.sls.service, `custom.${key}`, defaultValue);
  }

  getSlsValue(key: string): any {
    return get(this.sls, key);
  }

  hasRpc(): boolean {
    return this.hasCustomValue(Key.RpcPath)
      && this.hasCustomValue(Key.RpcMethodSource);
  }

  assemble(): void {
    const functions = chain(this.files)
      .filter(file => file.shouldRegister())
      .map(file => file.getHandler())
      .keyBy(handler => handler.getKey())
      .mapValues(handler => handler.toServerless())
      .value();

    if (this.hasRpc()) {
      const rpc = this.rpc!.getHandler();

      functions[rpc.getKey()] = rpc.toServerless();
    }

    set(
      this.sls.service,
      'functions',
      {
        ...get(this.sls.service, 'functions', {}),
        ...(functions),
      },
    );

    // @ts-ignore
    console.log('Functions', inspect(this.sls.service.functions, true, null));
  }

  wrap(): void {
    this.files.forEach((file) => {
      file.write();
    });

    if (this.hasRpc()) {
      this.rpc!.write();
    }
  }

  assembleAndWrap(): void {
    this.assemble();
    this.wrap();
  }
}

module.exports = Plugin;
