import { Action } from 'routing-controllers';
import jwt from 'jsonwebtoken';
import AuthService from '../service';
import dayjs from "dayjs";
import { ICurrentUser } from '../interfaces/auth';

async function currentUserChecker(action: Action) {
  const { request } = action;

  const authorization = request.headers?.authorization?.split(' ')
      || request.headers?.Authorization?.split(' ');
  const token = authorization[1];
  const decoded: any = jwt.decode(token);

  const authService = new AuthService();

  const user: ICurrentUser = await authService.readOne(decoded._id, 'company');
  
  if (user.company && dayjs().isAfter(user.company.expiryDate)) throw new Error('The company is expired');
  
  return user;
}

export default currentUserChecker;