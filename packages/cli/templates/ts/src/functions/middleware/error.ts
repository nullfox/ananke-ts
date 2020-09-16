/**
 * @generic
 * @description Error handler
 */
export default async (result: any, context: Ctx): Promise<any> => {
  if (result instanceof Error && (result as Boom).isServer) {
    // Do something here - throw error in APM like Sentry
  }

  return result;
};
