import dayjs from "dayjs";
import _ from "lodash";
import request from "supertest";
import { CompanyCreateDto } from "../../company/interfaces/dto";
import { FormTemplatePostDto } from "../../form-template/interfaces/dto";
import { MaterialPostDto } from "../../material/interfaces/dto";
import { FormPostDto } from "../interfaces/dto";

export type createFormParams = {
    app: any,
    jwt: string,
    data: {
        company: CompanyCreateDto,
        materials: MaterialPostDto[],
        formTemplate: FormTemplatePostDto,
        financialYear: string,
    }
}

export const getComingFinancialYearEndDate = (): string => {
    const financialYearEndDateThisYear = dayjs().month(2).date(31);

    if (dayjs().isBefore(financialYearEndDateThisYear)) {
        return financialYearEndDateThisYear.format('YYYY-MM-DD');
    } else {
        return financialYearEndDateThisYear.add(1, 'year').format('YYYY-MM-DD');
    }
}

export const generateFormPostDto = async ({ app, jwt, data }: createFormParams): Promise<FormPostDto> => {
    const clonedData = _.cloneDeep(data);

    // create company
    const res1 = await request(app).post(`/company`)
        .set('Authorization', `Bearer ${jwt}`)
        .send(clonedData.company);
    const companyId = res1.body.data;

    // create materials
    for (const material of clonedData.materials) {
        const createMaterialRes = await request(app).post(`/material`)
            .set('Authorization', `Bearer ${jwt}`)
            .send(material);
        clonedData.formTemplate.materials.push(createMaterialRes.body.data);
    }

    // create form template
    const res3 = await request(app).post(`/form-template`)
        .set('Authorization', `Bearer ${jwt}`)
        .send(clonedData.formTemplate);
    const formTemplateId = res3.body.data;

    return {
        formTemplate: formTemplateId,
        company: companyId,
        financialYear: clonedData.financialYear,
        assignees: null,
    }
}