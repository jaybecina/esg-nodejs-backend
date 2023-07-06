import _ from 'lodash';
import mongoose from 'mongoose';
import crudService from '../../utils/crudService';
import { IFormTemplate } from '../form-template/interfaces/formTemplate';
import { FormAdminInputData, FormPostDto, FormUserInputData } from './interfaces/dto';
import entities from './interfaces/entitles';
import MeterService from "../meter/service";
import MaterialService from "../material/service";
import { formStatus } from './interfaces/form';

export type FormCreateData = FormPostDto & {
    formTemplate: IFormTemplate;
}

class FormService extends crudService {
    private meterService: MeterService;
    private materialService: MaterialService;

    constructor() {
        super(entities);
        this.meterService = new MeterService();
        this.materialService = new MaterialService();
    }

    async create() { }

    public async createForm(data: FormCreateData) {
        // calculate how many fields
        const materialFieldsCount = await this.materialService.countFields(data.formTemplate.materials)

        const form = await entities.create({
            ...data,
            status: formStatus.inProgress,
            materialFieldsCount,
            inputtedFields: 0,
            fieldsTotal: 0,
        })

        return form._id.toString();
    }

    public async addMeter(id: string, meterIds: string[]) {
        const result = await entities.updateOne({ _id: id }, {
            $push: {
                meters: {
                    $each: meterIds.map(meterId => new mongoose.mongo.ObjectId(meterId)),
                }
            }
        });

        return result.acknowledged;
    }

    public async removeMeter(id: string, meterIds: string[]) {
        const result = await entities.updateOne({ _id: id }, {
            $pull: {
                meters: {
                    $in: meterIds.map(meterId => new mongoose.mongo.ObjectId(meterId)),
                }
            },
        });

        return result.acknowledged;
    }

    public async updateByUser(data: FormUserInputData) {
        const updateData = _.pick(data, ['status']);

        const result = await entities.updateOne({ _id: data._id }, {
            $set: {
                ...updateData,
            },
        });

        return result.acknowledged;
    }

    public async updateByAdmin(data: FormAdminInputData) {
        const pickData = _.pick(data, ['status']);
        const updateData = { ...pickData };

        if (typeof data.assignees !== 'undefined') {
            if (Array.isArray(data.assignees)) {
                updateData['assignees'] = data.assignees.map((userId) => new mongoose.mongo.ObjectId(userId));
            } else {
                updateData['assignees'] = null
            }

            const updateMeterResult = await this.meterService.updateByFormId(data._id, {
                assignees: updateData['assignees'],
            })

            if (!updateMeterResult.acknowledged) {
                throw new Error("Can't update meter's assignees");
            }
        }

        const result = await entities.updateOne({ _id: data._id }, {
            $set: {
                ...updateData,
            },
        });

        return result.acknowledged;
    }

    public async updateFieldsTotal(id: string) {
        const form = await entities.findById(id);
        if (!form) {
            throw new Error("Form not existed");
        }

        const meterCount = await this.meterService.count({
            form: new mongoose.mongo.ObjectId(id),
        })

        if (meterCount <= 0) {
            const result = await this.update(id, {
                fieldsTotal: 0,
                inputProgress: 0,
            })
    
            return result;
        }

        const fieldsTotal = form.materialFieldsCount * meterCount;
        const inputProgress = _.round(form.inputtedFieldsCount / fieldsTotal, 2);
        
        const result = await this.update(id, {
            fieldsTotal,
            inputProgress,
        })

        return result;
    }

    public async updateUserInputProgress(id: string) {
        let inputtedFieldsCount = 0;

        const form = await entities.findById(id);
        if (!form) {
            throw new Error("Form not existed");
        }

        const meters = await this.meterService.findByFormId(id);

        for (const meter of meters) {
            if (meter.inputs.length === 0) {
                // no input in that meter
                continue;
            }

            for (const input of meter.inputs) {
                if (Array.isArray(input)) {
                    // text
                    for (const inputText of input) {
                        if (!_.isEmpty(inputText.answer)) {
                            inputtedFieldsCount++;
                        }
                    }
                } else {
                    // matrix
                    for (const row of input.answer) {
                        for (const value of row) {
                            if (typeof value === 'string' && !_.isEmpty(value)) {
                                inputtedFieldsCount++;
                            } else if (typeof value === 'number' && _.isNumber(value)) {
                                inputtedFieldsCount++;
                            }
                        }
                    }
                }
            }
        }

        const inputProgress = form.fieldsTotal !== 0 ? _.round(inputtedFieldsCount / form.fieldsTotal, 2) : form.fieldsTotal

        const result = await this.update(id, {
            inputtedFieldsCount,
            inputProgress,
        })

        return result;
    }

    public async updateAdminCheck(id: string) {
        let adminCheckedCount = 0;

        const form = await entities.findById(id);
        if (!form) {
            throw new Error("Form not existed");
        }

        const meters = await this.meterService.findByFormId(id);

        for (const meter of meters) {
            if (typeof meter.approved === 'boolean' && meter.approved === true) {
                adminCheckedCount++;
            }
        }

        const adminCheckedProgress = meters.length > 0 ? _.round(adminCheckedCount / meters.length ,2) : 0;

        const result = await this.update(id, {
            adminCheckedCount,
            adminCheckedProgress,
        })

        return result;
    }

    public async updateAttachmentsCount(id: string) {
        const meters = await this.meterService.findByFormId(id);

        let count = 0;

        for (const meter of meters) {
            count += meter.attachments.length;
        }

        const result = await this.update(id, {
            attachmentsCount: count,
        });

        return result;
    }
}

export default FormService;
