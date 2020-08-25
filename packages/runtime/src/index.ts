import Bunyan from 'bunyan';

import { Boom as BoomError } from '@hapi/boom';

import Context, { DefaultContext } from './context';

import RPC, {
  Envelope,
  Request as RPCRequest,
} from './handler/rpc';

import Queue from './handler/queue';
import Generic from './handler/generic';

export namespace Request {
  export interface RPC extends RPCRequest {}
}

export namespace Response {
  export interface Boom extends BoomError {}
}

const Handler = {
  RPC,
  Queue,
  Generic,
};

export {
  Bunyan,
  Context,
  DefaultContext,
  Envelope,
  Handler,
};
