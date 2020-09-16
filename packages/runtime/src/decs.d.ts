declare module '@hapi/joi-date'
declare module 'acorn'

interface Validation {
  [key: string]: string
}

interface Options {
  requireAuth?: boolean;
  name?: string,
  context?: { [key: string]: string | Function };
  preMiddleware?: Array<string>;
  postMiddleware?: Array<string>;
  validation?: Validation;
}

interface Method {
  runner: Function;
  options?: Options;
}