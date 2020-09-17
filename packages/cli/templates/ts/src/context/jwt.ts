import {
  verify,
  VerifyErrors,
} from 'jsonwebtoken';

/**
 * @generic
 * @description JWT/auth context
 */
export default async (context: Ctx) => (
  // This would be its own class/file rather than fucked together here
  {
    verify: async (token: string) => (
      new Promise((resolve, reject) => {
        verify(
          token,
          context.Config.get('common.jwt.secret'),
          (err: VerifyErrors | null, decoded: object | undefined): void => {
            if (err) {
              reject(err);
            } else {
              resolve(decoded);
            }
          },
        );
      })
    ),
  }
);
