import {
  chain,
  has,
  set,
} from 'lodash';

import SSM, { Client } from '@ananke/config-ssm';
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

  private convictify(secrets: object): convict.Config<T> {
    const structured = {};

    chain(DEFAULTS)
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
      .forEach((value, key) => set(structured, key, value));

    const config = convict(structured);
    
    config.validate();

    return config;
  }

  async fetch(prefix: string): Promise<object> {
    const secrets = await this.ssm.fetch(prefix);

    return this.convictify(secrets);
  }
}

export {
  Client,
};

