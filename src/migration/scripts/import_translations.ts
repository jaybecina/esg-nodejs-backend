import mongoose from 'mongoose';
import nodePath from 'path';
import { readFile } from 'node:fs/promises';

import database from '../../utils/database';
import Content from "../../modules/content/interfaces/entities";
import { ContentCategory } from "../../modules/content/interfaces/content";

const filePath = nodePath.join(__dirname, '..', '..', '..', '/database', 'translations.json')

async function setup() {
    const uri = await database.getUri();
    await mongoose.connect(uri, { autoIndex: true });
    console.log('Connected to database');
}

async function up() {
    await setup();

    // read translations json file
    const file = await readFile(filePath, {
        encoding: 'utf8',
    })
    const translationsData = JSON.parse(file);

    // add new translations only
    for (const translationData of translationsData) {
        const newCustomFields = {};

        const content = await Content.findOne({
            title: translationData.title,
            category: ContentCategory.translation,
        }).lean()

        for (const key in translationData.customFields) {
            // find out which customFields are in json file only
            if (!Object.prototype.hasOwnProperty.call(content.customFields, key)) {
                const newTranslationsText = translationData.customFields[key];

                newCustomFields[key] = newTranslationsText;
            }
        }

        // update if have new customFields
        if (Object.keys(newCustomFields).length > 0) {
            const result = await Content.updateOne(
                {
                    title: translationData.title,
                    category: ContentCategory.translation,
                },
                {
                    $set: {
                        customFields: {
                            ...content.customFields,
                            ...newCustomFields,
                        }
                    }
                }
            )

            console.log('Result: ', {
                language: translationData.title,
                added: Object.keys(newCustomFields).length,
                result,
            });
        }
    }
}

(async () => {
    await up();

    process.exit();
})();
