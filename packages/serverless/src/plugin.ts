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
  set,
} from 'lodash';

import File, { RPC } from './plugin/file';

export enum Key {
  Prefix = 'ananke',

  PsuedoName = 'ananke.psuedoName',

  Context = 'ananke.function.context',
  FunctionSource = 'ananke.function.source',
  OnErrorFunction = 'ananke.function.onError',

  Rpc = 'ananke.rpc',
  RpcPath = 'ananke.rpc.path',
  RpcMethodSource = 'ananke.rpc.methods',
  RpcAuthenticator = 'ananke.rpc.authenticator',

  Rest = 'ananke.rest',
  RestAuthenticator = 'ananke.rest.authenticator',
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
      this.hasCustomValue(Key.Context),
      `${Key.Context} key must be set in serverless.yml (ex: custom.${Key.Context}: lib/context`,
    );

    ok(
      this.hasCustomValue(Key.FunctionSource),
      `${Key.FunctionSource} key must be set in serverless.yml (ex: custom.${Key.FunctionSource}: lib/functions`,
    );

    const files = sync(`${this.getCustomValue(Key.FunctionSource)}/**/*.+(js|ts)`);
    
    this.files = chain(files)
      .filter(file => !file.split('/').pop()?.startsWith('_'))
      .map(file => File.factory(file, this))
      .value();

    if (this.hasRpc()) {
      this.rpc = RPC.factory(this);
    }
  }

  hasCustomValue(key: Key): boolean {
    return has(this.sls.service, `custom.${key}`);
  }

  getCustomValue(key: Key, defaultValue?: string): string {
    return get(this.sls.service, `custom.${key}`, defaultValue);
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
