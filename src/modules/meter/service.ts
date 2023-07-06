import _ from 'lodash';
import mongoose from 'mongoose';
import { Types } from 'mongoose';
import crudService from '../../utils/crudService';
import { IFormPopulateMaterials } from '../form/interfaces/form';
import { IMaterial, inputType, IQnaMatrix, qnaType } from '../material/interfaces/materialForm';
import { MaterialProgressData as MaterialResultData, MeterInputMatrix, MeterInputText } from './interfaces/dto';
import entities from './interfaces/entitles';
import MaterialService from '../material/service';
import UnitService from '../unit/service';
import { IMeter, MeterInput, MeterAdminCheckData, MeterApprovalData, MeterPushAttachmentsData, MeterUserInputData, IMeterInputMatrix, MaterialInputResult, MeterUpdateAttachmentData, } from './interfaces/meter';
import { IUnit } from '../unit/interfaces/unit';

class MeterService extends crudService {
    private materialService: MaterialService;
    private unitService: UnitService;

    constructor() {
        super(entities);
        this.materialService = new MaterialService();
        this.unitService = new UnitService();
    }

    async create() { }

    public async findByFormId(formId: string) {
        const meters = await entities.find({ form: new mongoose.mongo.ObjectId(formId) })

        return meters;
    }

    public async isUniqueMeterName(formId: string, name: string, meterId?: string) {
        if (meterId) {
            const count = await entities.count({ 
                form: new mongoose.mongo.ObjectId(formId),
                _id: {
                    $ne: new mongoose.mongo.ObjectId(meterId),
                },
                name,
            })
    
            return count === 0;
        } else {
            const count = await entities.count({ 
                form: new mongoose.mongo.ObjectId(formId),
                name,
            })
    
            return count === 0;
        }
    }

    public async getMaterialInputResult(data: MaterialResultData): Promise<MaterialInputResult[]> {
        const result: MaterialInputResult[] = [];

        let searchValue;

        if (data.formId) {
            searchValue = {
                company: new mongoose.mongo.ObjectId(data.companyId),
                form: new mongoose.mongo.ObjectId(data.formId),
                financialYear: data.financialYear,
            }
        } else {
            searchValue = {
                company: new mongoose.mongo.ObjectId(data.companyId),
                financialYear: data.financialYear,
            }
        }

        const meters = await entities.find(searchValue).populate<{ form: IFormPopulateMaterials }>('form');

        const material: IMaterial = await this.materialService.readOne(data.materialId);
        if (!material) {
            throw new Error("Material not exist");
        }
        if (material.type !== qnaType.matrix) {
            throw new Error("It is a text material");
        }

        for (const qna of material.content) {
            if (this.isQnaMatrix(qna)) {
                for (const row of qna.rows) {
                    for (const col of qna.columns) {
                        if (col.inputType === inputType.number) {
                            result.push({
                                row: row.name,
                                col: col.name,
                                value: 0,
                                unit: col.outputUnit,
                            })
                        }
                    }
                }
            }
        }

        for (const meter of meters) {
            const materialsIndex = meter.form.formTemplate.materials.indexOf(new Types.ObjectId(data.materialId))

            if (materialsIndex === -1) {
                continue;
            }

            const input = meter.inputs[materialsIndex];

            let i = 0;
            if (this.isMeterInputMatrix(input)) {
                for (let r = 0; r < input.answer.length; r++) {
                    for (let c = 0; c < input.answer[r].length; c++) {
                        const qna = material.content[0]

                        if (this.isQnaMatrix(qna) && qna.columns[c].inputType !== inputType.number) {
                            continue;
                        }

                        const inputUnit = input.unit[c];
                        const units: IUnit[] = await this.unitService.read(1, 100, null, {
                            $or: [
                                { input: inputUnit },
                                { output: inputUnit }
                            ]
                        })

                        const ans = input.answer[r][c];
                        if (typeof ans === 'number') {
                            if (inputUnit === result[i].unit || inputUnit === 'N/A') {
                                result[i].value = _.round(result[i].value + ans, 2);
                            } else {
                                const foundOutputUnit = units.find((unit) => unit.output === result[i].unit);
                                const foundInputUnit = units.find((unit) => unit.input === result[i].unit);

                                if (foundOutputUnit) {
                                    result[i].value = _.round(result[i].value + ans * foundOutputUnit.rate, 2);
                                } else if (foundInputUnit) {
                                    result[i].value = _.round(result[i].value + ans / foundInputUnit.rate, 2);
                                } else {
                                    throw new Error("Can't match the unit from input to output");
                                }
                            }
                        } else {
                            result[i].value = _.round(result[i].value + 0, 2);
                        }

                        i++;
                    }
                }
            }
        }

        return result;
    }

    public inputResultGroupByRow(inputResults: MaterialInputResult[]) {
        const groupByRow = _.chain(inputResults).groupBy('row').map((groupedResults, rowName) => {
            const obj = {
                row: rowName,
            }

            groupedResults.forEach((result) => {
                obj[result.col] = {
                    value: result.value,
                    unit: result.unit,
                };
            })

            return obj;
        }).value();

        return groupByRow;
    }

    public inputResultGroupByCol(inputResults: MaterialInputResult[]) {
        const groupByCol = _.chain(inputResults).groupBy('col').map((groupedResults, colName) => {
            const obj = {
                col: colName,
            }

            groupedResults.forEach((result) => {
                obj[result.row] = {
                    value: result.value,
                    unit: result.unit,
                };
            })

            return obj;
        }).value();

        return groupByCol;
    }

    public async createMeter(data: Omit<IMeter,
        '_id' | 'inputs' | 'attachments' | 'approved' | 'errorReason' | 'finished' | 'checked'
    >) {
        const meter = await entities.create(data);
        return meter._id.toString();
    }

    public async updateByFormId(formId: string, update: any = {}) {
        const result = await entities.updateMany({
            form: new mongoose.mongo.ObjectId(formId)
        }, update)

        return result;
    }

    public async updateBySuperAdmin(data: MeterApprovalData) {
        if (data.checked && !_.isBoolean(data.approved)) {
            throw new Error('You must select the approval of meter');
        }

        // check the information is correct or not and provide error reason
        if (!this.validateMeterApprovalData(data)) {
            throw new Error('Please provide an error reason');
        }

        const result = await entities.updateOne({ _id: data._id }, {
            $set: {
                finished: _.isNil(data.approved) && !data.checked ? data.finished : data.approved,
                checked: data.checked,
                approved: data.approved,
                errorReason: !data.approved ? data.errorReason : '',
            }
        });

        return result.acknowledged;
    }

    public async updateByClientAdmin(data: MeterAdminCheckData, materials: IMaterial[]) {
        const pickData = _.pick(data, ['inputs', 'name', 'removeAttachments'])
        const updateData = { ...pickData };

        if (data.checked && !_.isBoolean(data.approved)) {
            throw new Error('You must select the approval of meter');
        }

        if (typeof data.assignees !== 'undefined') {
            if (Array.isArray(data.assignees)) {
                updateData['assignees'] = data.assignees.map((userId) => new mongoose.mongo.ObjectId(userId));
            } else {
                updateData['assignees'] = null
            }
        }

        // check the information is correct or not and provide error reason
        if (!this.validateMeterApprovalData(data)) {
            throw new Error('Please provide an error reason');
        }

        if (data.checked) {
            const validation = this.validateInputs(data.inputs, materials, data.checked);

            if (!validation) {
                throw new Error("Can't pass the validation");
            }
        }

        const result = await entities.updateOne({ _id: data._id }, {
            $set: {
                ...updateData,
                finished: _.isNil(data.approved) && !data.checked ? data.finished : data.approved,
                checked: data.checked,
                approved: data.approved,
                errorReason: data.approved === false ? data.errorReason : '',
            },
            $pull: {
                attachments: {
                    _id: {
                        $in: data.removeAttachments || [],
                    }
                }
            }
        });

        return result.acknowledged;
    }

    public async updateByUser(data: MeterUserInputData, materials: IMaterial[]) {
        const updateData = _.pick(data, ['name', 'inputs', 'finished']);

        if (data.finished) {
            const validation = this.validateInputs(data.inputs, materials, data.finished);

            if (!validation) {
                throw new Error("Can't pass the validation");
            }
        }

        const result = await entities.updateOne({ _id: data._id }, {
            $set: {
                ...updateData,
                checked: false,
            },
            $pull: {
                attachments: {
                    _id: {
                        $in: data.removeAttachments || [],
                    }
                }
            }
        });

        return result.acknowledged;
    }

    public async resetApprovalByFormId(formId: string) {
        const result = await entities.updateOne({ form: new mongoose.mongo.ObjectId(formId) }, {
            $set: {
                approved: null,
            },
        })

        return result.acknowledged;
    }

    public async pushAttachments(data: MeterPushAttachmentsData) {
        const result = await entities.updateOne({ _id: data._id }, {
            $push: {
                attachments: {
                    $each: data.attachments,
                }
            }
        });

        return result.acknowledged;
    }

    public async updateAttachmentDescription(data: MeterUpdateAttachmentData) {
        const result = await entities.updateOne(
            {
                _id: data._id,
                "attachments._id": new mongoose.mongo.ObjectId(data.attachmentId)
            },
            {
                $set: {
                    "attachments.$.description": data.description,
                }
            }
        )

        return result.acknowledged;
    }

    public async isThisFileIsUploadedBefore(id: string, fileName: string): Promise<boolean>{
        // const removeAttachmentIds: string[] = [];
        // search
        const meter = await this.readOne(id, ['attachments.file']);
        
        for (const attachment of meter.attachments) {
            if (attachment.file.name === fileName) {
                // removeAttachmentIds.push(attachment._id);
                return true;
            }
        }

        return false
    }

    public async deleteByFormId(formId: string) {
        const _id = new mongoose.mongo.ObjectId(formId);
        const result = await entities.deleteMany({ form: _id });
        return result.acknowledged;
    }

    public validateMeterApprovalData(data: MeterApprovalData): boolean {
        return data.approved === false ? !_.isEmpty(data.errorReason) : true
    }

    public validateInputs(inputs: MeterInput[], materials: IMaterial[], submitted: boolean): boolean {
        if (inputs.length !== materials.length) {
            throw new Error("Number of inputs doesn't match the number of materials");
        }

        for (let i = 0; i < inputs.length; i++) {
            const input = inputs[i];
            const material = materials[i];
            let isInputValidated = false;

            if (material.type === 'text' && Array.isArray(input)) {
                if (input.length !== material.content.length) {
                    return false;
                }

                for (const answerObj of input) {
                    const meterInputText = new MeterInputText(answerObj.answer);

                    isInputValidated = this.validateInputText(meterInputText, submitted);

                    if (!isInputValidated) return false;
                }
            } else if (
                material.type === 'matrix'
                && !Array.isArray(input)
                && Array.isArray(input.answer)
                && 'unit' in input
            ) {
                const meterInputMatrix = new MeterInputMatrix(input.answer, input.unit);

                isInputValidated = this.validateInputMatrix(meterInputMatrix, material, submitted);
            }

            if (!isInputValidated) {
                return false;
            }
        }

        return true;
    }

    public validateInputText(input: MeterInputText, submitted: boolean) {
        return submitted ? !_.isEmpty(input.answer) : true;
    }

    public validateInputMatrix(input: MeterInputMatrix, material: IMaterial, submitted: boolean) {
        for (let i = 0; i < material.content.length; i++) {
            const content = material.content[i];
            if (!this.isQnaMatrix(content)) {
                throw new Error("Can't validate the matrix");
            }

            for (let c = 0; c < content.columns.length; c++) {
                const column = content.columns[c];

                for (let r = 0; r < content.rows.length; r++) {
                    const value = input.answer[r][c];

                    if (submitted && column.inputType === 'text' && _.isEmpty(value.toString())) {
                        return false;
                    }

                    if (submitted && column.inputType === 'number' && !_.isNumber(value)) {
                        return false;
                    }
                }
            }
        }

        return true;
    }

    private isQnaMatrix(object: any): object is IQnaMatrix {
        return 'rows' in object;
    }

    public isMeterInputMatrix(input: any): input is IMeterInputMatrix {
        if (!input) {
            return false;
        }
        if (!('answer' in input)) {
            return false;
        }
        return !Array.isArray(input) && Array.isArray(input.answer) && 'unit' in input;
    }
}

export default MeterService;
