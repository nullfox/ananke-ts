import { SSM as Client } from 'aws-sdk';

export default class SSM {
    ssm: Client;

    static factory(ssmOrUndefined: Client | undefined): SSM;
    constructor(ssmOrUndefined: Client | undefined);

    private recursiveFetch;

    fetchRaw(prefix: string): Promise<object>;
    fetch(prefix: string): Promise<object>;
}

export { Client };