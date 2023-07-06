import mongoose from 'mongoose';

import { IUnit } from './unit';

const unitSchema = new mongoose.Schema<IUnit>({
  input: String,
  output: String,
  rate: Number,
});

unitSchema.index({
  input: 'text',
  output: 'text',
  rate: 'text',
});

unitSchema.index({
  input: 1,
  output: 1,
}, { unique: true });

const Unit = mongoose.model('units', unitSchema);

export default Unit;