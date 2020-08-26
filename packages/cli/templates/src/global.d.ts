type Bunyan = import('@ananke/runtime').Bunyan;

type RPCRequest = import('@ananke/runtime').Request.RPC;
type RESTRequest = import('@ananke/runtime').Request.REST;
type Boom = import('@ananke/runtime').Boom;

namespace Request {
  interface RPC extends RPCRequest {}
  interface REST extends RESTRequest {}
}

type Config = import('@ananke/config-ssm-convict').ConvictConfig;

interface Ctx {
  Logger: Bunyan;
  Config: Config;
  // Add additional types that exist on your Context here...
}