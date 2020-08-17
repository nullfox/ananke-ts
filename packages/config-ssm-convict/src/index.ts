import {
  chain,
  forEach,
  has,
  set,
} from 'lodash';

import SSM, {
  Client,
  Options,
} from '@ananke/config-ssm';

import convict from 'convict';

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

  private convictify(secrets: object): convict.Config<any> {
    const structured = {};

    const merged = chain(DEFAULTS)
      .merge(this.manifest)
      .merge(secrets)
      .mapValues((value, key) => (
        has(value, 'doc')
          ? value
          : {
            doc: key.split('.').join(' '),
            format: String,
            default: value,
            env: key.split('.').join('_').toUpperCase(),
          }
      ))
      .value();

    forEach(merged, (value, key) => set(structured, key, value));

    const config = convict(structured);
    
    config.validate();

    return config;
  }

  async fetch(prefix: string, options: Options = {}): Promise<object> {
    const secrets = await this.ssm.fetchRaw(prefix, options);

    return this.convictify(secrets);
  }
}

export {
  Client,
};

