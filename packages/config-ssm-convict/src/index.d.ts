import { Client } from '@ananke/config-ssm';

export default class Config {
    ssm: SSM;

    static factory(ssmOrUndefined: Client | undefined): Config;
    constructor(ssmOrUndefined: Client | undefined);
}

export { Client };