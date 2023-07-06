import { randomBytes, scrypt } from "crypto";
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import nodemailer from 'nodemailer';
import _ from "lodash";
import dayjs from "dayjs";
import { promisify } from "util";
import { getRandomString } from "../../utils";
import crudService from "../../utils/crudService";
import { JWTPayload } from "../../utils/interfaces";
import getEmailService from "../../utils/mailer";
import { MIN_PW_LENGTH, UserRegistrationDto, UserUpdateDto } from './interfaces/dto';
import entities from './interfaces/entities';
import CompanyService from "../company/service";
import { Roles } from "./interfaces/auth";

const scryptAsync = promisify(scrypt);
const TEMP_LOGIN_EXPIRE_IN = 3600 * 6; // 6 hours
const KEEP_LOGIN_EXPIRE_IN = 86400 * 7; // 7 days

class AuthService extends crudService {
  constructor() {
    super(entities);
  }

  // Using registration to override create
  async create() {}

  static async toHash(password: string) {
    const salt = randomBytes(8).toString("hex");
    const buf = (await scryptAsync(password, salt, 64)) as Buffer;
    return `${buf.toString("hex")}.${salt}`;
  }

  static async compare(storedPassword: string, suppliedPassword: string) {
    const [hashedPassword, salt] = storedPassword.split(".");
    const buf = (await scryptAsync(suppliedPassword, salt, 64)) as Buffer;
    return buf.toString("hex") === hashedPassword;
  }

  static validatePassword(password: string) {
    if (password.length < MIN_PW_LENGTH)
      throw new Error(`Minimum password length is ${MIN_PW_LENGTH} characters`);

    return true;
  }

  public async registration(data: UserRegistrationDto) {
    AuthService.validatePassword(data.password);
    
    const exists = await entities.findOne({ email: data.email });
    if (exists) throw new Error('User existsed');

    const hash = await AuthService.toHash(data.password);
    const parsedData = { ...data, hash };
    delete parsedData.password;

    await entities.create(parsedData);

    return this.login(data.email, data.password, true);
  }

  public async login(email: string, password: string, keepLoggedIn: boolean = false): Promise<string> {
    const user = await entities.findOne({ email });
    if (!user) throw new Error('User not existsed');

    let jwtExpiry = Math.floor(Date.now() / 1000) + (keepLoggedIn ? KEEP_LOGIN_EXPIRE_IN : TEMP_LOGIN_EXPIRE_IN);

    if (user.role !== Roles.superAdmin && !_.isNil(user.company)) {
      const companyService = new CompanyService();
      const company = await companyService.readOne(user.company.toString());
      if (dayjs().isAfter(company.expiryDate)) throw new Error('The company is expired');

      jwtExpiry = jwtExpiry < dayjs(company.expiryDate).unix() ? jwtExpiry : dayjs(company.expiryDate).unix();
    }

    const compared = await AuthService.compare(user.hash, password);
    if (!compared) throw new Error('Password not correct');

    const jwtData: JWTPayload = {
      _id: user._id.toString(),
      email,
      role: user.role,
      exp: jwtExpiry,
    }

    const token = jwt.sign(jwtData, process.env.JWT_SECRET);
    return token;
  }

  public async update(id: string, data: Partial<UserUpdateDto>): Promise<boolean> {
    const _id = new mongoose.mongo.ObjectId(id);
    const parsedData: Partial<UserUpdateDto & { hash: string }> = { ...data }

    if (parsedData.password) {
      const hash = await AuthService.toHash(parsedData.password);
      delete parsedData.password;
      parsedData.hash = hash;
    }

    const result = await entities.updateOne({ _id }, { $set: parsedData });
    return result.acknowledged;
  }

  /**
   * @returns returning string on development mode 
   * to reduce the smtp usage at this moment
   * TODO : Change it back to boolean return
   */
  public async resetPasswordRequest(email: string)
    : Promise<boolean | string> {
    const exists = await entities.findOne({ email });
    if (!exists) throw new Error('User not exists');

    const resetToken = getRandomString(20);
    const result = await entities.updateOne({ _id: exists._id }, 
      { $set: { resetToken: resetToken } });

    if (!result.acknowledged) throw new Error('Cannot update user');

    const emailService = await getEmailService();
    const info = await emailService.sendMail({
      from: '"Fred Foo 👻" <foo@example.com>', // sender address
      to: email,
      subject: 'Reset password request',
      html: `Please open: ${process.env.FRONTEND_URL}/auth/reset/${resetToken} to reset password.`, // plain text body
    });
  
    // Ethereal testing email only return in development mode
    return nodemailer.getTestMessageUrl(info);
  }

  public async resetPasswordByToken(token: string, password: string): Promise<boolean> {
    AuthService.validatePassword(password);
    if (token.length <= 0) throw new Error('Wrong token');

    const exists = await entities.findOne({ resetToken: token });
    if (!exists) throw new Error('Token not exists');

    const hash = await AuthService.toHash(password);
    const result = await entities.updateOne({ _id: exists._id }, 
      { $set: { resetToken: null, hash } });

    return result.acknowledged;
  }
}

export default AuthService;