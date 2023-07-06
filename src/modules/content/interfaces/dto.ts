import { ContentCategory, IContent } from './content';

export class ContentCreateDto implements IContent {
  title: string;
  thumbnail: string;
  content: string;
  intro: string;
  slug?: string;
  category?: ContentCategory;
  customFields: {
    [type: string]: string
  };
}
