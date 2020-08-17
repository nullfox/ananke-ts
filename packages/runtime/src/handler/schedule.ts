import Base from './base';

export default class Schedule extends Base {
  static factory(context: any, runner: Function, options: Options = {}): Schedule {
    return new Schedule(context, runner, options);
  }

  async exec(event: any): Promise<any> {
    return this.runner(
      event,
      this.context,
    );
  }
}
