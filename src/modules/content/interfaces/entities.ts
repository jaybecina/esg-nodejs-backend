import mongoose from 'mongoose';

import { ContentCategory, IContent } from './content';

const contentSchema = new mongoose.Schema<IContent>({
  title: String,
  thumbnail: String,
  content: String,
  intro: String,
  slug: String,
  category: {
    type: String,
    enum: ContentCategory,
  },
  customFields: {
    type: Map,
    of: String
  }
});

const Content = mongoose.model('content', contentSchema);

export default Content;