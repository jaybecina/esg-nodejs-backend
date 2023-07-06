import slugify from 'slugify';
import crudService from '../../utils/crudService';
import { IContent } from './interfaces/content';
import entities from './interfaces/entities';

class ContentService extends crudService {
  constructor() {
    super(entities);
  }

  async generateUniqueSlug(title: string): Promise<string> {
    let slug = slugify(title);
    let count = 1;
    while (await this.count<Partial<IContent>>({ slug }) > 0) {
      slug = slug + '-' + count;
      count++;
    }
    return slug;
  }

  translate(input: string, customFields: IContent['customFields']) {
    const searchKey = input.toLowerCase();

    const output = customFields[Object.keys(customFields).find(key => key.toLowerCase() === searchKey)];

    return output ? output : input;
  }
}

export default ContentService;