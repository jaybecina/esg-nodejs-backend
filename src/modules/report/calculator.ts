import _ from "lodash";
import { IForm } from "../form/interfaces/form";
import { IMaterialPointer, pointerMethod } from "../pointer/interfaces/pointer";
import PointerService from "../pointer/service";
import MeterService from "../meter/service";
import MaterialService from "../material/service";
import UnitService from "../unit/service";
import CalculationService from "../calculation/service";
import CompanyService from "../company/service";
import ConstantService from "../constant/service";
import { MeterInput } from "../meter/interfaces/meter";
import { ICalculation } from "../calculation/interfaces/calculation";
import { IMaterial } from "../material/interfaces/materialForm";
import { calculateResult, calculationResult } from "./interfaces/report";
import { SMeter } from "../meter/interfaces/entitles";
import { IConstant } from "../constant/interfaces/constant";

class Calculator {
    private meterService: MeterService;
    private pointerService: PointerService;
    private materialService: MaterialService;
    private unitService: UnitService;
    private calculationService: CalculationService;
    private companyService: CompanyService;
    private constantService: ConstantService;

    constructor() {
        this.meterService = new MeterService();
        this.pointerService = new PointerService();
        this.materialService = new MaterialService();
        this.unitService = new UnitService();
        this.calculationService = new CalculationService();
        this.companyService = new CompanyService();
        this.constantService = new ConstantService();
    }

    public async calculate(companyId: string, forms: IForm[], calculation: ICalculation): Promise<calculationResult> {
        const equation: (string | number)[] = [];
        let errorReasons: string[] = [];

        const expression = calculation.expression;

        for (const pointer of expression) {
            if (this.pointerService.isIMaterialPointer(pointer)) {
                const answer = await this.calculateMaterialPointer(forms, pointer);

                equation.push(answer);
            } else if (this.pointerService.isICalculationPointer(pointer)) {
                const calculations: ICalculation[] = await this.calculationService.read(1, 0, null, {
                    latest: true,
                    uniqueId: pointer.calculationUniqueId,
                })

                if (calculations.length === 0) {
                    equation.push('ERROR!');
                    errorReasons.push(`- Can't find the calculation "${pointer.calculationUniqueId}"`);
                }

                const result = await this.calculate(companyId, forms, calculations[0])

                equation.push(result.value);
                errorReasons = errorReasons.concat(result.reasons);
            } else if (this.pointerService.isIConstantPointer(pointer)) {
                // get constant value from company location
                const company = await this.companyService.readOne(companyId);

                // get the constant
                const constants: IConstant[] = await this.constantService.read(1, 0, null, {
                    uniqueId: pointer.constantUniqueId,
                });

                if (constants.length !== 1) {
                    equation.push('ERROR!');
                    errorReasons.push(`- Can't find the constant "${pointer.constantUniqueId}"`)
                    continue;
                }

                const constant = constants[0];
                const locationConvertValue = constant.meta.find((item) => {
                    return item.location === company.location;
                })

                if (!locationConvertValue) {
                    equation.push('ERROR!');
                    continue;
                }

                equation.push(locationConvertValue.value);
            } else {
                equation.push(pointer.text)
            }
        }

        try {
            const result = eval(equation.join(''));
            return {
                value: result,
                reasons: errorReasons,
            }
        } catch (error) {
            errorReasons.push(`- ${calculation.name} is not valid`);

            return {
                value: 'ERROR!',
                reasons: errorReasons,
            }
        }
    }

    public async calculateMaterialPointer(forms: IForm[], pointer: IMaterialPointer): Promise<number> {
        const answers: number[] = [];
        const meterInputIndexMaps: Array<{
            materialId: string,
            materialUniqueId: string,
            inputsIndex: number,
            meters: SMeter[],
        }> = [];

        for (const form of forms) {
            for (let i = 0; i < form.formTemplate.materials.length; i++) {
                const materialId = form.formTemplate.materials[i];
                const material: IMaterial = await this.materialService.readOne(materialId);

                if (material.uniqueId === pointer.materialUniqueId) {
                    const meters = await this.meterService.findByFormId(form._id);

                    meterInputIndexMaps.push({
                        materialId: form.formTemplate.materials[i],
                        materialUniqueId: pointer.materialUniqueId,
                        inputsIndex: i,
                        meters,
                    })

                    break;
                }
            }
        }

        for (const meterInputIndexMap of meterInputIndexMaps) {
            const meterInputList = meterInputIndexMap.meters.map((meter) => {
                return meter.inputs[meterInputIndexMap.inputsIndex]
            })

            const material = await this.materialService.readOne(meterInputIndexMap.materialId);

            if (pointer.method === pointerMethod.sum) {
                const sumResult = await this.sum(material, meterInputList, pointer);
                answers.push(_.round(sumResult.value, 2))
            } else if (pointer.method === pointerMethod.countif) {
                const countifResult = await this.countif(material, meterInputList, pointer);
                answers.push(_.round(countifResult.value, 2))
            }
        }

        return _.sum(answers);
    }

    public async sum(material: IMaterial, meterInputList: MeterInput[], pointer: IMaterialPointer): Promise<calculateResult> {
        const result = {
            value: 0,
            fieldsCount: 0,
        };

        const content = material.content[0];

        if (this.materialService.isQnaMatrix(content)) {
            for (const inputs of meterInputList) {
                if (this.meterService.isMeterInputMatrix(inputs)) {
                    const { row, col } = pointer;
                    const { answer, unit } = inputs;

                    // specific row & specific col
                    if (row > -1 && col > -1) {
                        const inputtedValue = answer[row][col];
                        const value = typeof inputtedValue === "number" ? inputtedValue : 0;

                        const outputUnit = content.columns[col].outputUnit;

                        const convertedValue = await this.unitService.convert(value, unit[col], outputUnit);

                        result.value = _.round(result.value + convertedValue, 2);
                        result.fieldsCount += 1;
                    }

                    // row only
                    if (row > -1 && col === -1) {
                        const inputtedValues = answer[row];

                        for (let c = 0; c < inputtedValues.length; c++) {
                            const inputtedValue = inputtedValues[c];

                            const value = typeof inputtedValue === "number" ? inputtedValue : 0;

                            const outputUnit = content.columns[c].outputUnit;

                            const convertedValue = await this.unitService.convert(value, unit[c], outputUnit);

                            result.value = _.round(result.value + convertedValue, 2);
                            result.fieldsCount += 1;
                        }
                    }

                    // col only
                    if (row === -1 && col > -1) {
                        for (let r = 0; r < answer.length; r++) {
                            const answerRow = answer[r];

                            const inputtedValue = answerRow[col];
                            const value = typeof inputtedValue === "number" ? inputtedValue : 0

                            const outputUnit = content.columns[col].outputUnit;

                            const convertedValue = await this.unitService.convert(value, unit[col], outputUnit);

                            result.value = _.round(result.value + convertedValue, 2)
                            result.fieldsCount += 1;
                        }
                    }

                    // all
                    if (row === -1 && col === -1) {
                        for (let r = 0; r < answer.length; r++) {
                            for (let c = 0; c < answer[r].length; c++) {
                                const inputtedValue = answer[r][c];
                                const value = typeof inputtedValue === "number" ? inputtedValue : 0;

                                const outputUnit = content.columns[c].outputUnit;

                                const convertedValue = await this.unitService.convert(value, unit[r], outputUnit);

                                result.value = _.round(result.value + convertedValue, 2);
                                result.fieldsCount += 1;
                            }
                        }
                    }
                }
            }
        }

        result.value = _.round(result.value, 2);

        return result;
    }

    public async countif(material: IMaterial, meterInputList: MeterInput[], pointer: IMaterialPointer): Promise<calculateResult> {
        const result = {
            value: 0,
            fieldsCount: 0,
        };

        const regex = new RegExp(pointer.payload['search'].toString(), 'i');

        const content = material.content[0];

        if (this.materialService.isQnaMatrix(content)) {
            for (const inputs of meterInputList) {
                if (this.meterService.isMeterInputMatrix(inputs)) {
                    const { row, col } = pointer;
                    const { answer } = inputs;

                    // specific row & specific col
                    if (row > -1 && col > -1) {
                        const inputtedValue = answer[row][col];

                        if (regex.test(inputtedValue.toString())) {
                            result.value += 1;
                            result.fieldsCount += 1;
                        }
                    }

                    // row only
                    if (row > -1 && col === -1) {
                        const inputtedValues = answer[row];

                        for (const inputtedValue of inputtedValues) {
                            if (regex.test(inputtedValue.toString())) {
                                result.value += 1;
                                result.fieldsCount += 1;
                            }
                        }
                    }

                    // col only
                    if (row === -1 && col > -1) {
                        for (let r = 0; r < answer.length; r++) {
                            const answerRow = answer[r];

                            const inputtedValue = answerRow[col];

                            if (regex.test(inputtedValue.toString())) {
                                result.value += 1;
                                result.fieldsCount += 1;
                            }
                        }
                    }

                    // all
                    if (row === -1 && col === -1) {
                        for (let r = 0; r < answer.length; r++) {
                            for (let c = 0; c < answer[r].length; c++) {
                                const inputtedValue = answer[r][c];

                                if (regex.test(inputtedValue.toString())) {
                                    result.value += 1;
                                    result.fieldsCount += 1;
                                }
                            }
                        }
                    }
                }
            }
        }

        return result;
    }
}

export default Calculator
