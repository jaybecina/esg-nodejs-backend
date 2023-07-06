import { Authorized, Body, CurrentUser, Get, JsonController, Param, Post, QueryParam, QueryParams, } from 'routing-controllers';
import mongoose from 'mongoose';
import _ from 'lodash';
import { stringify } from 'csv-stringify/sync';

import { ICurrentUser, Roles } from '../auth/interfaces/auth';
import { ReportDownloadParams, ReportGetParams, ReportPostDto } from './interfaces/dto';
import { ICalculation } from '../calculation/interfaces/calculation';
import ReportService from './service';
import Calculator from "./calculator";
import CalculationService from '../calculation/service';
import FormService from '../form/service';
import ContentService from '../content/service';
import UserActivityLogService from '../user-activity-log/service';
import { IReport } from './interfaces/report';
import { IForm } from '../form/interfaces/form';
import { ContentCategory, IContent } from '../content/interfaces/content';
import { editReportEvent, exportReportEvent } from '../user-activity-log/template/report';

const path = 'report';

@JsonController()
class ReportController {
    private service: ReportService;
    private calculator: Calculator;
    private calculationService: CalculationService;
    private formService: FormService;
    private contentService: ContentService;
    private userActivityLogService: UserActivityLogService;

    constructor() {
        this.service = new ReportService();
        this.calculator = new Calculator();
        this.calculationService = new CalculationService();
        this.formService = new FormService();
        this.contentService = new ContentService();
        this.userActivityLogService = new UserActivityLogService();
    }

    @Authorized([Roles.superAdmin, Roles.clientAdmin])
    @Get(`/${path}`)
    async getAll(
        @QueryParams() query: ReportGetParams,
    ) {
        const { page, limit, filters } = query;
        const searchValue = {
            ...filters,
        }

        const result = await this.service.read(page, limit, null, searchValue);
        const count = await this.service.count(searchValue);
        return { status: 'success', data: result, meta: { count, page } };
    }

    @Authorized([Roles.superAdmin, Roles.clientAdmin])
    @Get(`/${path}/:name`)
    async get(
        @Param('name') name: string,
    ) {
        const result = await this.service.read(1, 0, null, { name });
        return { status: 'success', data: result };
    }

    @Authorized([Roles.superAdmin, Roles.clientAdmin])
    @Get(`/${path}/:name/company/:companyId/financialYear/:financialYear`)
    async downloadReport(
        @CurrentUser() user: ICurrentUser,
        @Param('name') name: string,
        @Param('companyId') companyId: string,
        @Param('financialYear') financialYear: string,
        @QueryParams() query: ReportDownloadParams,
    ) {
        const { format, locale } = query;

        if (user.role !== Roles.superAdmin && user.company._id !== companyId) {
            throw new Error("Forbidden");
        }

        const reports: IReport[] = await this.service.read(1, 0, null, {
            name: name,
        })

        if (reports.length === 0) {
            throw new Error("Can't find the report setting");
        }

        const forms: IForm[] = await this.formService.read(1, 0, null, {
            company: new mongoose.mongo.ObjectId(companyId),
            financialYear,
        })

        if (forms.length === 0) {
            throw new Error("Can't find any form in this company & financial year");
        }

        console.log({ forms: forms[0].formTemplate })

        const calculations: ICalculation[] = await this.calculationService.read(1, 0, null, {
            _id: { $in: reports[0].calculations.map((calculationId) => new mongoose.mongo.ObjectId(calculationId)) }
        })

        if (calculations.length === 0) {
            throw new Error("Can't find any calculations");
        }

        // calculations sorting
        const sortedCalculations = reports[0].calculations.map((calculationId) => {
            return calculations.find((calculation) => {
                return calculation._id === calculationId;
            })
        })

        let translate = (input: string) => input;
        if (locale && locale !== 'en') {
            const content: IContent[] = await this.contentService.read(1, 0, null, {
                title: locale,
                category: ContentCategory.translation,
            })

            if (content.length > 0) {
                translate = (input: string) => this.contentService.translate(input, content[0].customFields);
            }
        }

        const result = [];

        console.log({ reports })

        for (const calculation of sortedCalculations) {
            const calculationResult = await this.calculator.calculate(companyId, forms, calculation);


            const data = {
                name: translate(calculation.name),
                uniqueId: calculation.uniqueId,
                version: calculation.version,
                latest: calculation.latest,
                result: typeof calculationResult.value === 'number' ? _.round(calculationResult.value, 2) : calculationResult,
                unit: translate(calculation.unit),
                expression: calculation.expression.map((pointer) => {
                    if (!pointer.payload) {
                        return pointer.text;
                    }

                    const keys = Object.keys(pointer.payload)
                    if (keys.length === 0) {
                        return pointer.text;
                    }

                    return keys.reduce((text, key) => {
                        return text.replace(`{{${key}}}`, `"${pointer.payload[key].toString()}"`);
                    }, pointer.text)
                }).join(''),
                error: calculationResult.reasons.join('\n'),
            }

            result.push(data)
        }

        await this.userActivityLogService.create({
            userId: user._id,
            resourceId: reports[0]._id,
            data: result,
            ...exportReportEvent,
        });

        if (format === 'json') {
            return { status: 'success', data: result };
        }

        return {
            status: 'success',
            data: stringify(result, { header: true })
        };
    }

    @Authorized([Roles.superAdmin])
    @Post(`/${path}`)
    async post(
        @Body() body: ReportPostDto,
        @CurrentUser() user: ICurrentUser,
    ) {
        // create/update form
        const reports = await this.service.read(1, 0, null, {
            name: body.name,
        })

        if (reports.length === 0) {
            // create new report object
            const result = await this.service.create(body);

            await this.userActivityLogService.create({
              userId: user._id,
              resourceId: result,
              data: body,
              ...editReportEvent,
            });

            return { status: 'success', data: result };
        } else {
            const result = await this.service.update(reports[0]._id, body);

            await this.userActivityLogService.create({
              userId: user._id,
              resourceId: reports[0]._id,
              data: body,
              ...editReportEvent,
            });

            return { status: 'success', data: result };
        }
    }
}

export default ReportController;
