import mongoose from 'mongoose';

import database from '../../utils/database';

import Form from "../../modules/form/interfaces/entitles";

async function setup() {
    const uri = await database.getUri();
    await mongoose.connect(uri, { autoIndex: true });
    console.log('Connected to database');
    console.log(uri);
}

async function up() {
    await setup();

    // add default value to attachmentsCount to all form documents in MongoDB
    const result = await Form.updateMany({
        attachmentsCount: undefined
    }, {
        attachmentsCount: 0,
    });

    console.log(result);
}

(async () => {
    await up();

    process.exit();
})();
