import { badRequest } from '@hapi/boom';

/**
 * @generic
 * @description Auth middleware
 */
export default async (request: any, context: Ctx): Promise<any> => {
  if (!request.headers?.Authorization) {
    return request;
  }

  try {
    const decoded = await context.JWT.verify(request.headers?.Authorization);

    return {
      request,
      principalId: (decoded as DecodedJWT).sub,
    };
  } catch (error) {
    throw badRequest(error.message);
  }
};
