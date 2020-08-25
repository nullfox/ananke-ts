import Bunyan from 'bunyan';

import { Boom } from '@hapi/boom';

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

const Handler = {
  RPC,
  Queue,
  Generic,
};

export {
  Boom,
  Bunyan,
  Context,
  DefaultContext,
  Envelope,
  Handler,
};
