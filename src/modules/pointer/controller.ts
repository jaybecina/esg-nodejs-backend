import { Authorized, Get, JsonController, Param, } from 'routing-controllers';
import PointerService from './service';
import CalculationService from '../calculation/service';
import ConstantService from '../constant/service';

const path = 'pointer';

@JsonController()
class PointerController {
    private service: PointerService;
    private calculationService: CalculationService;
    private constantService: ConstantService;

    constructor() {
        this.service = new PointerService();
        this.calculationService = new CalculationService();
        this.constantService = new ConstantService();
    }

    @Authorized()
    @Get(`/${path}`)
    async getAll() {
        const pointers = this.service.generateBasePointers();
        return { status: 'success', data: pointers };
    }

    @Authorized()
    @Get(`/${path}/constant/:id`)
    async getConstantPointer(
        @Param('id') id: string,
    ){
        const constant = await this.constantService.readOne(id);

        if (!constant) {
            throw new Error("Can't find the constant");
        }

        const result = this.service.generateConstantPointer(constant.uniqueId, constant.year);
        return { status: 'success', data: result, meta: {} };
    }

    @Authorized()
    @Get(`/${path}/calculation/:id`)
    async getCalculationPointer(
        @Param('id') id: string,
    ){
        const calculation = await this.calculationService.readOne(id);

        if (!calculation) {
            throw new Error("Can't find the calculation");
        }

        if (!calculation.latest) {
            throw new Error("This calculation is not latest");
        }

        const result = this.service.generateCalculationPointer(calculation.uniqueId);
        return { status: 'success', data: result, meta: {} };
    }
}

export default PointerController;
