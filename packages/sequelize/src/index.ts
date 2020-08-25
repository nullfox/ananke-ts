import {
  readdirSync,
} from 'fs';

import{
  join,
} from 'path';

import {
  ConnectionOptions,
  DataType,
  DataTypes,
  Dialect,
  Model,
  Op,
  Sequelize,
} from 'sequelize';

import {
  chain,
  get,
  capitalize,
  has,
  mapValues,
} from 'lodash';

export interface AdditionalConnectionOptions {
  dialect: Dialect;
  dialectOptions?: {
    collate?: string;

    [key: string]: any;
  }

  [key: string]: any;
}

export interface ModelConfig {
  [key: string]: { [key: string]: any }
}

export interface Models {
  [key: string]: Model
}

export interface ModelStatic extends Model {
  models?: Models;

  associate?: Function;
  setup(
    connection: Sequelize,
    dataTypes: { [key: string]: DataType },
    modelConfig?: ModelConfig,
  ): Model;
}

export default class ConnectionManager {
  connection: Sequelize

  static createConnection(
    options: ConnectionOptions,
    additional?: AdditionalConnectionOptions
  ): Sequelize {
    return new Sequelize(
      options.database!,
      options.username!,
      options.password,
      {
        host: options.host,
        port: (options.port as number) || 3306,
        dialect: additional?.dialect || 'mysql',
        dialectOptions: {},
        logging: console.log,
        define: {
          charset: 'utf8mb4',
          timestamps: true,
          underscored: true,
        },
      },
    );
  }

  static factory(connection: Sequelize): ConnectionManager {
    return new ConnectionManager(connection);
  }

  constructor(connection: Sequelize) {
    this.connection = connection;
  }

  setup(models = {}, modelConfig: ModelConfig = {}): Models {
    return mapValues(
      models,
      (model: ModelStatic, key: string) => {
        if (has(model, 'setup')) {
          model.setup(
            this.connection,
            get(modelConfig, key, {}),
          )
        }

        if (has(model, 'associate')) {
          model.associate!(models);
        }

        model.models = models;

        return model;
      },
    );
  }

  load(path: string): Models {
    const models = chain(readdirSync(path))
      .filter((file) => file !== 'index.js')
      .map((file) => (
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

export {
  DataType,
  DataTypes,
  Model,
  Op,
  Sequelize,
};
