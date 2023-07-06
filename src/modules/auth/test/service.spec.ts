require('dotenv').config();

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import mongoose from 'mongoose';
import Service from '../service';
import { Roles } from '../interfaces/auth';
import database from '../../../utils/database';
import jwt from 'jsonwebtoken';
import dayjs from "dayjs";
import User from '../interfaces/entities';

chai.use(chaiAsPromised);
chai.should();
const expect = chai.expect;
const JWT_SECRET = process.env.JWT_SECRET || '';

describe('auth service', () => {
  let service: Service;

  const sampleUser = {
    password: 'bar123456',
    email: 'foo@gmail.com',
    role: Roles.superAdmin,
    name: 'Foo Bar',
    company: undefined,
    phone: '98887888',
    defaultLanguage: '63871a114d9e6ea0860f2ee4', // random ObjectId
  }

  before(async () => {
    const dbUri = await database.getUri();
    await mongoose.connect(dbUri);
    service = new Service();
  });

  it('should return jwt token when register and signin', async function() {
    const token = await service.registration(sampleUser);
    const decoded: any = jwt.verify(token, JWT_SECRET);
    expect(decoded.email).equal(sampleUser.email);

    const token2 = await service.login(sampleUser.email, sampleUser.password);
    const decoded2: any = jwt.verify(token2, JWT_SECRET);
    expect(decoded2.email).equal(sampleUser.email);
  });

  it('should set exp time to be 6 hours if no keepLoggedIn', async function () {
    const token2 = await service.login(sampleUser.email, sampleUser.password);
    const decoded2: any = jwt.verify(token2, JWT_SECRET);
    expect(decoded2.email).equal(sampleUser.email);
    expect(dayjs.unix(decoded2.exp).diff(dayjs(), 'hour') + 1).equal(6);
  })

  it('should set exp time to be 6 hours if keepLoggedIn is false', async function () {
    const token = await service.login(sampleUser.email, sampleUser.password, false);
    const decoded: any = jwt.verify(token, JWT_SECRET);
    expect(decoded.email).equal(sampleUser.email);
    expect(dayjs.unix(decoded.exp).diff(dayjs(), 'hour') + 1).equal(6);
  })

  it('should set exp time to be 7 days if keepLoggedIn is true', async function () {
    const token = await service.login(sampleUser.email, sampleUser.password, true);
    const decoded: any = jwt.verify(token, JWT_SECRET);
    expect(decoded.email).equal(sampleUser.email);
    expect(dayjs.unix(decoded.exp).diff(dayjs(), 'day') + 1).equal(7);
  })

  it('should throw error when wrong password', async function() {
    await expect(service.login(sampleUser.email, sampleUser.password)).to.be.not.rejected;
    await expect(service.login(sampleUser.email, '123456')).to.be.rejected;
  });

  it('should return correct data after updating user', async function() {
    const login = await service.login(sampleUser.email, sampleUser.password);
    const user: any = jwt.decode(login);
    const data = { role: Roles.user }
    const result = await service.update(user._id, data);
    expect(result).is.true;

    const login2 = await service.login(sampleUser.email, sampleUser.password);
    const user2: any = jwt.decode(login2);
    expect(user2.role).equal(data.role);
  });

  it('should able to request reset token', async function() {
    this.timeout(10000);

    const requestRes = await service.resetPasswordRequest(sampleUser.email);
    expect(requestRes).is.string;
    
    // As reset will not expose to any method so need to retrieve from db
    const user = await User.findOne({ email: sampleUser.email });
    const newPassword = 'newpassword';
    const resetRes = await service.resetPasswordByToken(user?.resetToken || '', newPassword);
    expect(resetRes).is.true;

    const token = await service.login(sampleUser.email, newPassword);
    expect(token).is.string;
  });

  after(async () => {
    await database.reset();
    await database.shutdown();
    await mongoose.disconnect();
  });
});