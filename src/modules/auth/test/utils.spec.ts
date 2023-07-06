require('dotenv').config();

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import _ from 'lodash';
import authChecker from '../utils/authChecker';
import currentUserChecker from '../utils/currentUserChecker';
import { JWTPayload } from '../../../utils/interfaces';
import AuthService from '../service';
import { Roles } from '../interfaces/auth';
import database from '../../../utils/database';

chai.use(chaiAsPromised);
chai.should();
const expect = chai.expect;

function getToken(jwtData: JWTPayload, secrectSufix: string = '') {
  return jwt.sign(jwtData, process.env.JWT_SECRET + secrectSufix);
}

function getAction(token: string) {
  return {
    request: { headers: { ['Authorization']: `Bearer ${token}` } },
    response: null,
  };
}

describe('auth utils', () => {
  const LOGIN_EXPIRE_IN = 86400 * 7;

  const sampleUserJwtPayload: JWTPayload= {
    _id: '635a47ca59ee72aaf780e823',
    email: 'user1@gmail.com',
    role: Roles.user,
    exp: Math.floor(Date.now() / 1000) + LOGIN_EXPIRE_IN,
  }

  const sampleSuperAdminData = {
    password: 'bar123456',
    email: 'foo@gmail.com',
    role: Roles.superAdmin,
    name: 'Foo Bar',
    phone: '98887888',
    defaultLanguage: '63871a114d9e6ea0860f2ee4', // random ObjectId
  }

  it('should return true if token is correct', async function() {
    const action = getAction(getToken(sampleUserJwtPayload));
    expect(await authChecker(action)).is.true;
  });

  it('should return true if limited user role by array', async function() {
    const action = getAction(getToken(sampleUserJwtPayload));
    expect(await authChecker(action, ['user'])).is.true;
  });

  it('should return true is limited user role by string', async function() {
    const action = getAction(getToken(sampleUserJwtPayload));
    expect(await authChecker(action, 'user')).is.true;
  });

  it('should return false if wrong token', async function() {
    const action = getAction(getToken(sampleUserJwtPayload, '123'));
    expect(await authChecker(action)).is.false;
  });

  it('should return false if wrong user role', async function() {
    const action = getAction(getToken(sampleUserJwtPayload));
    expect(await authChecker(action, 'admin')).is.false;
  });

  it('should return user object on currentUserChecker', async function() {
    const dbUri = await database.getUri();
    await mongoose.connect(dbUri);
    const authService = new AuthService();

    const superAdmin1Token = await authService.registration(sampleSuperAdminData);

    const action = getAction(superAdmin1Token);
    const user = await currentUserChecker(action);

    await database.reset();
    await database.shutdown();
    await mongoose.disconnect();
    
    expect(user).to.include(_.omit(sampleSuperAdminData, 'password'));
  });
});