declare module '@hapi/joi-date'
declare module 'acorn'

interface Validation {
  [key: string]: string
}

interface Options {
  requireAuth?: boolean;
  authenticator?: string;
  preMiddleware?: Array<string>;
  postMiddleware?: Array<string>;
  validation?: Validation;
}

interface Method {
  runner: Function;
  options?: Options;
}