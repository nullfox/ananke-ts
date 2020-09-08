import {
  object,
} from 'dot-object';

import {
  SSM as Client,
} from 'aws-sdk';

import {
  has,
  chain,
  mapKeys,
  omitBy,
  pickBy,
} from 'lodash';

export interface Options {
  only?: RegExp
  except?: RegExp
  transformKey?: Function
  sortKey?: Function
}

export default class SSM {
  ssm: Client

  static factory(ssmOrUndefined: Client | undefined): SSM {
    return new SSM(ssmOrUndefined);
  }

  constructor(ssmOrUndefined: Client | undefined) {
    this.ssm = ssmOrUndefined || new Client();
  }

  private async recursiveFetch(prefix: string, token: string | undefined, secrets: {} = {}): Promise<object> {
    const normalizedPath = `${prefix.replace(/\/$/, '')}/`;

    const request = {
      Path: normalizedPath,
      NextToken: token,
      Recursive: true,
      WithDecryption: true,
    };

    const response = await this.ssm.getParametersByPath(request).promise();

    const aggregate = chain(response.Parameters)
      .map(param => (
        [
          param.Name!.replace(request.Path, '').replace(/\//g, '.'),
          param.Value,
        ]
      ))
      .fromPairs()
      .merge(secrets)
      .value();

    if (response.NextToken) {
      return this.recursiveFetch(
        normalizedPath,
        response.NextToken,
        aggregate,
      )
    }

    return aggregate;
  }

  async fetchRaw(prefix: string, options: Options = {}): Promise<object> {
    const fetched = await this.recursiveFetch(prefix, undefined);

    let filtered = fetched;

    if (has(options, 'only')) {
      filtered = pickBy(filtered, (val, key) => options.only!.test(key));
    }

    if (has(options, 'except')) {
      filtered = omitBy(filtered, (val, key) => options.except!.test(key));
    }

    if (has(options, 'sortKey')) {
      filtered = chain(filtered)
        .toPairs()
        .sortBy((pair) => options.sortKey!(pair[0]))
        .fromPairs()
        .value();
    }

    if (has(options, 'transformKey')) {
      filtered = mapKeys(filtered, (val, key) => options.transformKey!(key));
    }

    return filtered;
  }

  async fetch(prefix: string, options: Options = {}): Promise<object> {
    const raw = await this.fetchRaw(prefix, options);

    return object(raw);
  }
}

export {
  Client,
};
