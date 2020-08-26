/**
 * @generic
 * @description RPC authenticator
 */
export default async (header: string, context: Ctx): Promise<any> => {
  const bool = Math.random() >= 0.5;

  // If true, we just return a fake id
  if (bool) {
    return 1234;
  }

  // Return udnefined to deny
  return undefined;
};
