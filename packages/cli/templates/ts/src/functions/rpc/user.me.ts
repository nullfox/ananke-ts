/**
 * @method
 * @description User get me
 * @group user
 */
export default async (request: Request.RPC, context: Ctx): Promise<any> => (
  `Hello world to user id: ${request.principalId!}`
);
