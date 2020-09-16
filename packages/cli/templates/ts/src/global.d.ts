type Bunyan = import('@ananke/runtime').Bunyan;

type RPCRequest = import('@ananke/runtime').Request.RPC;
type RESTRequest = import('@ananke/runtime').Request.REST;
type Boom = import('@ananke/runtime').Boom;

type Models = import('./models').Models;

namespace Request {
  interface RPC extends RPCRequest {}
  interface REST extends RESTRequest {}
}

interface DecodedJWT {
  sub: string | number;
}

type Config = import('@ananke/config-ssm-convict').ConvictConfig;

interface Ctx {
  Logger: Bunyan;
  Config: Config;
  Database: Models;
  JWT: {
    verify: (string) => Promise<DecodedJWT | Error>
  };
  // Add additional types that exist on your Context here...
}