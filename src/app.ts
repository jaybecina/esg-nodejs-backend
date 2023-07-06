require('dotenv').config();
import 'reflect-metadata';
import { createExpressServer } from 'routing-controllers';
import authorizationChecked from './modules/auth/utils/authChecker';
import currentUserChecker from './modules/auth/utils/currentUserChecker';
import database from './utils/database';
import mongoose from 'mongoose';
import dayjs from 'dayjs';

import { getExt } from './utils';
import { startAllJobs } from './scheduled-job';

let server;
const TEST_MODE = process.env.TEST === 'true';

async function main() {
  const uri = await database.getUri();

  if (!TEST_MODE) console.log(uri);
  await mongoose.connect(uri, { autoIndex: true });
  if (!TEST_MODE) console.log('Conencted to database');

  const app = await createExpressServer({
    cors: true,
    defaultErrorHandler: false,
    development: false,
    authorizationChecker: authorizationChecked,
    currentUserChecker: currentUserChecker,
    controllers: [__dirname + '/modules/**/controller' + getExt()],
    middlewares: [__dirname + '/middlewares/*' + getExt()],
  });

  server = await app.listen(process.env.PORT);
  if (!TEST_MODE) console.log(`Listen to port ${process.env.PORT} on ${dayjs().format()}`);

  startAllJobs();

  return server;
}

export async function shutdown() {
  server.close();
  mongoose.disconnect();
  database.shutdown();
}

export default main;