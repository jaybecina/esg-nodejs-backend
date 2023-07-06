import { Middleware, ExpressErrorMiddlewareInterface } from 'routing-controllers';

@Middleware({ type: 'after' })
export class CustomErrorHandler implements ExpressErrorMiddlewareInterface {
  error(error: any, request: any, response: any, next: (err: any) => any) {
    response.statusCode = error.httpCode || 500;
    response.json({
      status: 'error',
      message: error.message,
      error,
    });
  }
}