import {
  object as objectify,
} from 'dot-object';

import {
  capitalize,
  chain,
  has,
} from 'lodash';

import SSM, {
  Client,
  Options,
} from '@ananke/config-ssm';

import convict, { Config as ConvictConfig } from 'convict';

const DEFAULTS = {
  env: {
    doc: 'Node environment',
    format: ['development', 'staging', 'production'],
    default: 'development',
    env: 'NODE_ENV',
  },
};

export default class Config {
  manifest: object
  ssm: SSM

  static fromFile(path: string, ssmOrUndefined: Client | undefined): Config {
    const file = require(path);

    return this.factory(file.default ? file.default : file, ssmOrUndefined);
  }

  static factory(manifest: object, ssmOrUndefined: Client | undefined): Config {
    return new Config(manifest, ssmOrUndefined);
  }

  constructor(manifest: object, ssmOrUndefined: Client | undefined) {
    this.manifest = manifest;
    this.ssm = SSM.factory(ssmOrUndefined);
  }

  private convictify(secrets: object): ConvictConfig<any> {
    const merged = chain(this.manifest)
      .mapValues((value, key) => (
        has(value, 'doc')
          ? value
          : {
            doc: key.split('.').join(' '),
            format: typeof value ? (global as { [key: string]: any })[(capitalize(value) as string)] : String,
            default: value,
            env: key.split('.').join('_').toUpperCase(),
          }
      ))
      .thru((manifest) => objectify(manifest))
      .merge(DEFAULTS)
      .value();

    const config = convict(merged);

    config.load(secrets);
    
    config.validate();

    return config;
  }

  async fetch(prefix: string, options: Options = {}): Promise<ConvictConfig<any>> {
    const secrets = await this.ssm.fetch(prefix, options);

    return this.convictify(secrets);
  }
}

export {
  Client,
  ConvictConfig,
};

