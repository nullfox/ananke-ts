import Base from './base';

export default class Generic extends Base {
  static factory(context: any, runner: Function, options: Options = {}): Generic {
    return new Generic(context, runner, options);
  }

  async exec(event: any): Promise<any> {
    return this.runner(
      event,
      this.context,
      this.options,
    );
  }
}
