import Bunyan from 'bunyan';

import Boom from '@hapi/boom';

import Joi from '@hapi/joi';

import Context, { DefaultContext } from './context';

import RPC, {
  Envelope,
  Request as RPCRequest,
} from './handler/rpc';

import REST, {
  Request as RESTRequest,
} from './handler/rest';

import Queue from './handler/queue';
import Generic from './handler/generic';

export namespace Request {
  export interface RPC extends RPCRequest {}
  export interface REST extends RESTRequest {}
}

const Handler = {
  REST,
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
  Joi,
};
