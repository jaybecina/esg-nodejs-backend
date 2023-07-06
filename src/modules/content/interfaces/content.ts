export enum ContentCategory {
  faq = 'faq',
  contactUs = 'contactUs',
  translation = 'translation',
}

export interface IContent {
  title: string,
  thumbnail: string,
  content: string,
  intro: string,
  slug?: string,
  category?: ContentCategory,
  customFields: {
    [type: string]: string
  },
}
