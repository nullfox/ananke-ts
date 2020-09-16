import {
  internal,
} from "@hapi/boom";

import Base from './base';

export default class Generic extends Base {
  static factory(runner: Function, options: Options = {}): Generic {
    return new Generic(runner, options);
  }

  async exec(event: any): Promise<any> {
    let context: any;

    try {
      context = await this.resolveContext();
    } catch (error) {
      this.logger.error(error);

      throw internal(`Context could not be resolved: ${error.message}`);
    }

    return this.runner(
      event,
      context,
      this.options,
    );
  }
}
