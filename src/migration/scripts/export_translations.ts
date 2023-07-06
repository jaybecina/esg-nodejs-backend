import mongoose from 'mongoose';
import nodePath from 'path';
import { writeFile } from 'node:fs/promises';

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

    // get translations from MongoDB
    const translations = await Content.find({
        category: ContentCategory.translation,
    }).lean();
    
    const json = JSON.stringify(translations, null, 2);

    await writeFile(filePath, json, {
        flag: 'w+',
    })
}


(async () => {
    await up();

    process.exit();
})();
