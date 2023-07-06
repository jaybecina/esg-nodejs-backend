import mongoose from 'mongoose';
import { IBookmark } from './bookmark';

const bookmarkSchema = new mongoose.Schema<IBookmark>({
  collectionName: String,
  documentId: mongoose.Schema.Types.ObjectId,
  userId: mongoose.Schema.Types.ObjectId,
}, { timestamps: true });

bookmarkSchema.index({
  userId: 'text',
});

const Bookmark = mongoose.model('bookmarks', bookmarkSchema);

export default Bookmark;