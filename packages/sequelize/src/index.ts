import {
  readdirSync,
} from 'fs';

import{
  join,
} from 'path';

import {
  ConnectionOptions,
  Model,
  Sequelize,
} from 'sequelize';

import {
  chain,
  get,
  capitalize,
  has,
} from 'lodash';

export interface Models {
  [key: string]: Model | Sequelize | typeof Sequelize
}

export interface ModelConfig {
  [key: string]: { [key: string]: any }
}

export default class ConnectionManager {
  connection: Sequelize
  modelConfig: ModelConfig

  static createConnection(options: ConnectionOptions, additional: { [key: string]: any }): Sequelize {
    return new Sequelize(
      options.database!,
      options.username!,
      options.password,
      {
        port: (options.port as number) || 3306,
        dialect: additional.dialect || 'mysql',
        dialectOptions: {
          collate: 'utf8mb4_general_ci',
        },
        logging: console.log,
        define: {
          charset: 'utf8mb4',
          timestamps: true,
          underscored: true,
        },
      },
    );
  }

  static factory(connection: Sequelize, modelConfig: ModelConfig = {}): ConnectionManager {
    return new ConnectionManager(connection, modelConfig);
  }

  constructor(connection: Sequelize, modelConfig: ModelConfig = {}) {
    this.connection = connection;
    this.modelConfig = modelConfig;
  }

  setup(models = {}): Models {
    return chain(models)
      .mapValues((model: Model, key: string) => {
        if (has(model, 'init')) {
          // @ts-ignore
          model.init(this.connection, Sequelize, get(this.modelConfig, key, {}))
        }

        if (has(model, 'associate')) {
          // @ts-ignore
          model.associate(models);
        }

        // Overload models onto the static
        // @ts-ignore
        model.models = models;

        return model;
      })
      .merge({
        Sequelize,
        Connection: this.connection,
      })
      .value();
  }

  load(path: string): Models {
    const models = chain(readdirSync(path))
      .filter(file => file !== 'index.js')
      .map(file => (
        [
          capitalize(file.split('.').shift()!),
          require(join(
            __dirname,
            file,
          )),
        ]
      ))
      .fromPairs()
      .value();

    return this.setup(models);
  }
}