declare module '@hapi/joi-date'
declare module 'acorn'

interface Validation {
  [key: string]: string
}

interface Options {
  auth?: boolean;
  authenticator?: string;
  errorHandler?: string;
  validation?: Validation;
}

interface Method {
  runner: Function;
  options?: Options;
}