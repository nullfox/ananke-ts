/**
 * @method
 * @description Hello world
 * @group application
 * @auth false
 * @param {string.required} name - Name
 */
export default async (request, context) => (
  `Hello world ${request.params.name}`
);
