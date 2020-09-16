import Config, { Client } from '@ananke/config-ssm-convict';

/**
 * @generic
 * @description Config context
 */
export default async () => (
  Config.factory(
    {
      'common.jwt.secret': '',
    },
    new Client({ region: 'us-east-1' }),
  )
    .fetch('/ananke/development')
);
