import { Context } from '@ananke/runtime';

import Config, { Client } from '@ananke/config-ssm-convict';
import ConnectionManager from '@ananke/sequelize';

import * as Models from './models';

export default Context.factory(
  'test'
)
  .inject(
    'Config',
    async () => (
      Config.factory(
        {
          // Configurations here in format of { 'dot.notated.key': 'defaultValue' }
          'common.database.host': 'foobar',
        },
        new Client({ region: 'us-east-1' }),
      )
        .fetch('/olympus/development')
    ),
  )
  .inject(
    'Database',
    async (context) => (
      ConnectionManager.factory(
        ConnectionManager.createConnection(
          {
            ...context.Config.get('common.database'),
            username: context.Config.get('common.database.user'),
            database: 'olympus_generic',
          },
          {
            dialect: 'mysql',
          },
        )
      )
          .setup(Models, {})
    ),
  );