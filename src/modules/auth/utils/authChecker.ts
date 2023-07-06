import { Action } from 'routing-controllers';
import jwt from 'jsonwebtoken';

async function authorizationChecked(action: Action, roles?: string[] | string) {
  const { request } = action;

  try {
    const authorization = request.headers?.authorization?.split(' ')
      || request.headers?.Authorization?.split(' ');
    if (authorization?.[0] !== 'Bearer') return false;

    const token = authorization[1];
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET);

    if (!roles || !roles.length) return true;
    if (roles.indexOf(decoded.role) !== -1) return true;

    return false;
  } catch(e) {
    return false
  }
};

export default authorizationChecked;