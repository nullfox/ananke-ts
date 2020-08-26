/**
 * @method
 * @description Hello world
 * @group application
 * @auth false
 * @param {string.required} name - Name
 */
export default async (request: Request.RPC, context: Ctx): Promise<any> => (
  `Hello world ${request.params.name}`
);
