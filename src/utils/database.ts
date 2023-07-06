require('dotenv').config();
import { MongoMemoryServer } from 'mongodb-memory-server';

import User from "../modules/auth/interfaces/entities";
import Company from "../modules/company/interfaces/entities";
import Content from "../modules/content/interfaces/entities";
import Unit from "../modules/unit/interfaces/entities";

class Database {
  static mongod: MongoMemoryServer | null = null;

  static async reset() {
    await User.deleteMany({});
    await Company.deleteMany({});
    await Content.deleteMany({});
    await Unit.deleteMany({});
  }
  
  static async getUri(): Promise<string> {
    if (Database.mongod) return Database.mongod.getUri();
  
    if (process.env.TEST === 'true') {
      Database.mongod = await MongoMemoryServer.create();
      return Database.mongod.getUri();
    }
  
    return process.env.DATABASE_URI;
  }
  
  static async shutdown() {
    if (!Database.mongod) return;
    Database.mongod.stop();
    Database.mongod = null;

  }
}

export default Database;