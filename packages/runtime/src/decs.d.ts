declare module '@hapi/joi-date'
declare module 'acorn'

interface Validation {
  [key: string]: string
}

interface Options {
  auth?: boolean;
  validation?: Validation;
}

interface Method {
  runner: Function;
  options?: Options;
}

interface Envelope {
  id: string;
  jsonrpc: string;
  method: string;
  params?: object | Array<any>;
}