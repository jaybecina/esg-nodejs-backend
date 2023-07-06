import mongoose from 'mongoose';

import database from '../../utils/database';
import Constant from "../../modules/constant/interfaces/entitles";
import Unit from "../../modules/unit/interfaces/entities";

async function setup() {
    const uri = await database.getUri();
    await mongoose.connect(uri, { autoIndex: true });
    console.log('Connected to database');
}

async function up() {
    await setup();

    // convert unit objectid to text
    const constants = await Constant.find()

    let updatedCount = 0;
    for (const constant of constants) {
        try {
            const unit = await Unit.findById(constant.unit);

            if (unit) {
                const outputUnitText = unit.output;

                await Constant.findByIdAndUpdate(constant._id, {
                    $set: {
                        unit: outputUnitText,
                    }
                })

                updatedCount++;
            }
        } catch (error) {
            continue;
        }
    }

    console.log({ updatedCount });
}

(async () => {
    await up();

    process.exit();
})();
