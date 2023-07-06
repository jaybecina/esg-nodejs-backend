import mongoose from 'mongoose';

import database from '../../utils/database';
import Company from "../../modules/company/interfaces/entities";

async function up() {
    const uri = await database.getUri();
    await mongoose.connect(uri, { autoIndex: true });
    console.log('Connected to database');

    // Set Location of Company to Hong Kong if not existed
    const result = await Company.updateMany(
        {
            location: {
                $exists: false,
            }
        },
        {
            $set: {
                location: 'Hong Kong',
            }
        }
    )

    console.log(result);
}

(async () => {
    await up();

    process.exit();
})();
