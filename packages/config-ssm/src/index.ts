import {
  object,
} from 'dot-object';

import {
  SSM as Client,
} from 'aws-sdk';

import {
  chain,
} from 'lodash';

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

    return object(aggregate);
  }

  async fetch(prefix: string): Promise<object> {
    return this.recursiveFetch(prefix, undefined);
  }
}

export {
  Client,
};
