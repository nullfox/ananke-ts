import Bunyan from 'bunyan';

export interface DefaultContext {
  Logger: Bunyan;
};

export default class Context {
  name: string
  defaultContext: { [key: string]: any }
  registry: Array<any>
  chain: Promise<any> | undefined

  static factory(name: string, defaultContext: { [key: string]: any } = {}): Context {
    return new Context(name, defaultContext);
  }

  constructor(name: string, defaultContext: { [key: string]: any } = {}) {
    this.name = name;
    this.defaultContext = defaultContext;
    this.registry = [];
    this.chain = undefined;

    this.inject(
      'Logger',
      () => (
        Bunyan.createLogger({
          name: this.name,
          serializers: Bunyan.stdSerializers,
          level: (
            process.env.LOG_LEVEL
              ? parseInt(process.env.LOG_LEVEL, 10)
              : 30
          ),
        })
      ),
    );
  }

  inject(key: string, fn: Function): Context {
    this.registry.push({
      key,
      fn,
    });

    this.chain = undefined;

    return this;
  }

  async exec(callback: Function): Promise<any> {
    if (!this.chain) {
      let chain = Promise.resolve(this.defaultContext);

      this.registry.forEach(({ key, fn }) => {
        chain = chain.then(async (context) => (
          Object.assign(
            context,
            {
              [key]: await fn(context),
            },
          )
        ));
      });

      this.chain = chain;
    }

    const context = await this.chain;

    return callback(context);
  }
}