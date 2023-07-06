import { ContentCategory } from "../interfaces/content";
import { ContentCreateDto } from "../interfaces/dto";

export const translationSample: ContentCreateDto = {
    title: "en",
    thumbnail: "",
    content: "",
    intro: "",
    slug: "en",
    category: ContentCategory.translation,
    customFields: {},
}

export const translationZhHantSample: ContentCreateDto = {
    title: "zh-Hant",
    thumbnail: "",
    content: "",
    intro: "",
    slug: "zh-Hant",
    category: ContentCategory.translation,
    customFields: {
        'home': '主頁',
        'company list': '公司名單',
        'test sum calculation': '測試總和計算',
        'Person': '人',
    },
}
