import nodemailer from 'nodemailer';

const isTest = true

const user = {
  user: process.env.SMTP_USER,
  pass: process.env.SMTP_PASSWORD,
}

async function getEmailService() {
  const testAccount = await nodemailer.createTestAccount();

  return nodemailer.createTransport({
    host: isTest ? 'smtp.ethereal.email' : 'smtp.gmail.com',
    port: isTest ? 587 : 465,
    secure: isTest ? false : true, // true for 465, false for other ports
    auth: isTest ? { user: testAccount.user, pass: testAccount.pass } : user,
  });
}

export default getEmailService;
