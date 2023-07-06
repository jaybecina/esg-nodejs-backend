import { IBaseApiQueryParams } from '../../../utils/interfaces';
import { IBookmark } from './bookmark';

export class BookmarkCreateDto implements Omit<IBookmark, '_id' | 'userId'> {
  collectionName: string;
  documentId: string;
}

export class BookmarkGetDto implements IBookmark {
  _id: string;
  collectionName: string;
  documentId: string;
  userId: string;
}

export class BookmarkGetParams implements IBaseApiQueryParams {
  filters: Partial<IBookmark>;
  page: number = 1;
  limit: number = 10;
  search?: string;
}