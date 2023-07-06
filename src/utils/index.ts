import mongoose from "mongoose";

export function getExt() {
  return process.env.BUILD === 'true' ? '.js' : '.ts';
}

export function recurisveObjectIdStringifyer(o: any) {
  if (typeof o == 'object' && o != null) {
    if (o instanceof mongoose.Types.ObjectId) {
      o = o.toString();
    } else if (Array.isArray(o)) {
      for (const k in o) {
        o[k] = recurisveObjectIdStringifyer(o[k]);
      }
    } else {
      for (const k of Object.keys(o)) {
        o[k] = recurisveObjectIdStringifyer(o[k]);
      }
    }
  }
  return o;
};

// Not cryptographically secure
export function getRandomString(length: number): string {
  var result = '';
  var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  var charactersLength = characters.length;
  for (var i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}