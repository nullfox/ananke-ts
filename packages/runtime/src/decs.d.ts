declare module '@hapi/joi-date'
declare module 'acorn'

interface Validation {
  [key: string]: string
}

interface Options {
  auth?: boolean;
  authenticator?: string;
  onError?: string;
  validation?: Validation;
}

interface Method {
  runner: Function;
  options?: Options;
}