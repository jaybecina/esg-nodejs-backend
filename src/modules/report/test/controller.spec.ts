require('dotenv').config();

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import request from "supertest";
import mongoose from 'mongoose';

import server, { shutdown } from '../../../app';
import { sampleCompanies } from '../../company/test/sample';
import { constantSample } from '../../constant/test/sample';
import { translationSample, translationZhHantSample } from '../../content/test/sample';
import { sampleFormTemplates } from '../../form-template/test/sample';
import { formStatus } from '../../form/interfaces/form';
import { generateFormPostDto, getComingFinancialYearEndDate } from '../../form/test/sample';
import { sampleMaterials } from '../../material/test/sample';
import { generateMeterPostDto } from '../../meter/test/sample';
import { requiredNotificationTemplateDtoArr } from '../../notification-template/test/sample';
import { unitSample2 } from '../../unit/test/sample';

chai.use(chaiAsPromised);
chai.should();
const expect = chai.expect;

let app: any;
let superAdminJwt: string;

const path = 'report';

describe('report controller', () => {
    before(async () => {
        app = await server();
        const response = await request(app).post('/auth/superadmin?secret=dijMz13OsM')
        superAdminJwt = response.body.data;

        // create translations
        const postContentRes1 = await request(app).post(`/content`)
            .set('Authorization', `Bearer ${superAdminJwt}`)
            .send(translationSample);
        expect(postContentRes1.status).equal(200);

        const postContentRes2 = await request(app).post(`/content`)
            .set('Authorization', `Bearer ${superAdminJwt}`)
            .send(translationZhHantSample);
        expect(postContentRes2.status).equal(200);

        // create required notification template
        for (const dto of requiredNotificationTemplateDtoArr) {
            const postNotificationTemplateRes = await request(app).post(`/notification-template`)
                .set('Authorization', `Bearer ${superAdminJwt}`)
                .send(dto);
            expect(postNotificationTemplateRes.status).equal(200);
        }

        // create unit
        const postUnitRes1 = await request(app).post(`/unit`)
            .set('Authorization', `Bearer ${superAdminJwt}`)
            .send({
                input: 'mL',
                output: 'L',
                rate: 0.001,
            });
        expect(postUnitRes1.status).equal(200);

        const postUnitRes2 = await request(app).post(`/unit`)
            .set('Authorization', `Bearer ${superAdminJwt}`)
            .send({
                input: 'Person',
                output: 'Person',
                rate: 1,
            });

        const postUnitRes3 = await request(app).post(`/unit`)
            .set('Authorization', `Bearer ${superAdminJwt}`)
            .send(unitSample2);
        const unit3 = postUnitRes3.body.data;

        // create constant
        const postConstantRes = await request(app).post(`/constant`)
            .set('Authorization', `Bearer ${superAdminJwt}`)
            .send(constantSample)

        // create form
        const sampleFormPostDto = await generateFormPostDto({
            app,
            jwt: superAdminJwt,
            data: {
                company: sampleCompanies[0],
                materials: sampleMaterials,
                formTemplate: sampleFormTemplates[0],
                financialYear: getComingFinancialYearEndDate(),
            },
        })

        const res1 = await request(app).post(`/form`)
            .set('Authorization', `Bearer ${superAdminJwt}`)
            .send(sampleFormPostDto);
        const formId = res1.body.data;

        // create meter to the form
        const meterPostDto = generateMeterPostDto(formId, 'Meter 1');
        const res2 = await request(app).post(`/meter`)
            .set('Authorization', `Bearer ${superAdminJwt}`)
            .send(meterPostDto);
        const meterId = res2.body.data;

        const correctInputs = [
            [{ answer: 'ans 1' }, { answer: 'ans2' }],
            {
                answer: [
                    [123, 100.23, 'Name 1'], [234, 234.56, 'Name 2']
                ],
                unit: ["L", "L", "N/A"],
            }
        ];

        // save inputs
        const putMeterRes1 = await request(app).put(`/meter/${meterId}`)
            .set('Authorization', `Bearer ${superAdminJwt}`)
            .send({
                inputs: correctInputs,
                submitted: false,
            });


        const putFormRes1 = await request(app).put(`/form/${formId}`)
            .set('Authorization', `Bearer ${superAdminJwt}`)
            .send({
                submitted: true,
                nextStatus: formStatus.submitted,
            });

        // complete the form
        const putMeterRes2 = await request(app).put(`/meter/${meterId}`)
            .set('Authorization', `Bearer ${superAdminJwt}`)
            .send({
                inputs: correctInputs,
                submitted: false,
                approved: true,
            });

        const putFormRes2 = await request(app).put(`/form/${formId}`)
            .set('Authorization', `Bearer ${superAdminJwt}`)
            .send({
                submitted: true,
                nextStatus: formStatus.completed,
            });
    })

    it('should create env-report report with sum function', async () => {
        // create calculation
        const getMaterialRes1 = await request(app).get(`/material`)
            .set('Authorization', `Bearer ${superAdminJwt}`);
        const matrixMaterial = getMaterialRes1.body.data[1];
        const getMaterialPointerRes1 = await request(app).get(`/material/${matrixMaterial._id}/pointer`)
            .set('Authorization', `Bearer ${superAdminJwt}`);

        const postCalculationRes1 = await request(app).post(`/calculation`)
            .set('Authorization', `Bearer ${superAdminJwt}`)
            .send({
                name: 'test sum calculation',
                uniqueId: 'test-sum-calculation',
                unit: 'Person',
                expression: [
                    getMaterialPointerRes1.body.data[0],
                    {
                        "text": "+",
                        "method": "operator"
                    },
                    getMaterialPointerRes1.body.data[1],
                ]
            });
        expect(postCalculationRes1.status).equal(200);
        expect(postCalculationRes1.body.data).to.be.an('string');

        const postCalculationRes2 = await request(app).post(`/calculation`)
            .set('Authorization', `Bearer ${superAdminJwt}`)
            .send({
                name: 'test sum calculation 2',
                uniqueId: 'test-sum-calculation-2',
                unit: 'm',
                expression: [
                    getMaterialPointerRes1.body.data[4],
                    {
                        "text": "+",
                        "method": "operator"
                    },
                    getMaterialPointerRes1.body.data[6],
                    {
                        "text": "+",
                        "method": "operator"
                    },
                    getMaterialPointerRes1.body.data[8],
                ]
            });
        expect(postCalculationRes2.status).equal(200);
        expect(postCalculationRes2.body.data).to.be.an('string');

        // create env-report
        const postReportRes1 = await request(app).post(`/${path}`)
            .set('Authorization', `Bearer ${superAdminJwt}`)
            .send({
                name: 'env-report',
                calculations: [
                    postCalculationRes1.body.data,
                    postCalculationRes2.body.data,
                ],
            });
        expect(postReportRes1.status).equal(200);
        expect(postReportRes1.body.data).to.be.an('string');
    })

    it('should get env-report', async () => {
        const getEnvReportRes1 = await request(app).get(`/${path}/env-report`)
            .set('Authorization', `Bearer ${superAdminJwt}`);
        expect(getEnvReportRes1.status).equal(200);

        const report = getEnvReportRes1.body.data[0];
        expect(report._id).to.be.an('string');
        expect(report.name).equal('env-report');
        expect(report.calculations).to.be.an('array');
        expect(report.calculations.length).equal(2);
    })

    it('should get the env-report result', async () => {
        // get company
        const getCompanyRes1 = await request(app).get(`/company`)
            .set('Authorization', `Bearer ${superAdminJwt}`);
        expect(getCompanyRes1.status).equal(200);
        const company = getCompanyRes1.body.data[0];

        // download the report
        const getEnvReportRes1 = await request(app).get(`/${path}/env-report/company/${company._id}/financialYear/${company.yearEnd}?format=json`)
            .set('Authorization', `Bearer ${superAdminJwt}`);
        expect(getEnvReportRes1.status).equal(200);
        expect(getEnvReportRes1.body.data).to.be.an('array');
        expect(getEnvReportRes1.body.data.length).equal(2);

        const envReportRow1 = getEnvReportRes1.body.data[0];
        expect(envReportRow1.name).equal('test sum calculation');
        expect(envReportRow1.uniqueId).equal('test-sum-calculation');
        expect(envReportRow1.result).equal(123 + 100.23 * 1000);
        expect(envReportRow1.unit).equal('Person');

        const envReportRow2 = getEnvReportRes1.body.data[1];
        expect(envReportRow2.name).equal('test sum calculation 2');
        expect(envReportRow2.uniqueId).equal('test-sum-calculation-2');
        expect(envReportRow2.result).equal((123 + 100.23 * 1000) + (123 + 234) + (123 + 100.23 * 1000 + 234 + 234.56 * 1000));
        expect(envReportRow2.unit).equal('m');
    })

    it('should translate the name of row in the report if translation is available', async () => {
        // get company
        const getCompanyRes1 = await request(app).get(`/company`)
            .set('Authorization', `Bearer ${superAdminJwt}`);
        expect(getCompanyRes1.status).equal(200);
        const company = getCompanyRes1.body.data[0];

        // download the report
        const getEnvReportRes1 = await request(app).get(`/${path}/env-report/company/${company._id}/financialYear/${company.yearEnd}?format=json&locale=zh-Hant`)
            .set('Authorization', `Bearer ${superAdminJwt}`);
        expect(getEnvReportRes1.status).equal(200);
        expect(getEnvReportRes1.body.data).to.be.an('array');
        expect(getEnvReportRes1.body.data.length).equal(2);

        const envReportRow1 = getEnvReportRes1.body.data[0];
        expect(envReportRow1.name).equal('測試總和計算');
        expect(envReportRow1.unit).equal('人');

        const envReportRow2 = getEnvReportRes1.body.data[1];
        expect(envReportRow2.name).equal('test sum calculation 2');
        expect(envReportRow2.unit).equal('m');
    })

    it('should create gov-report with countif function', async () => {
        // create calculation
        const getMaterialRes1 = await request(app).get(`/material`)
            .set('Authorization', `Bearer ${superAdminJwt}`);
        const matrixMaterial = getMaterialRes1.body.data[1];
        const getMaterialPointerRes1 = await request(app).get(`/material/${matrixMaterial._id}/pointer`)
            .set('Authorization', `Bearer ${superAdminJwt}`);

        const postCalculationRes1 = await request(app).post(`/calculation`)
            .set('Authorization', `Bearer ${superAdminJwt}`)
            .send({
                name: 'test countif calculation',
                uniqueId: 'test-countif-calculation',
                unit: 'm',
                expression: [
                    {
                        ...getMaterialPointerRes1.body.data[11],
                        payload: {
                            search: 'name 1'
                        }
                    },
                ]
            });
        expect(postCalculationRes1.status).equal(200);
        expect(postCalculationRes1.body.data).to.be.an('string');

        const postCalculationRes2 = await request(app).post(`/calculation`)
            .set('Authorization', `Bearer ${superAdminJwt}`)
            .send({
                name: 'test countif calculation 2',
                uniqueId: 'test-countif-calculation-2',
                unit: 'm',
                expression: [
                    {
                        ...getMaterialPointerRes1.body.data[15],
                        payload: {
                            search: 1,
                        }
                    },
                    {
                        "text": "+",
                        "method": "operator"
                    },
                    {
                        ...getMaterialPointerRes1.body.data[19],
                        payload: {
                            search: 'na',
                        }
                    },
                    {
                        "text": "+",
                        "method": "operator"
                    },
                    {
                        ...getMaterialPointerRes1.body.data[20],
                        payload: {
                            search: 'n',
                        }
                    },
                ]
            });
        expect(postCalculationRes2.status).equal(200);
        expect(postCalculationRes2.body.data).to.be.an('string');

        // create env-report
        const postReportRes1 = await request(app).post(`/${path}`)
            .set('Authorization', `Bearer ${superAdminJwt}`)
            .send({
                name: 'gov-report',
                calculations: [
                    postCalculationRes1.body.data,
                    postCalculationRes2.body.data,
                ],
            });
        expect(postReportRes1.status).equal(200);
        expect(postReportRes1.body.data).to.be.an('string');
    })

    it('should get gov-report', async () => {
        const getGovReportRes1 = await request(app).get(`/${path}/gov-report`)
            .set('Authorization', `Bearer ${superAdminJwt}`);
        expect(getGovReportRes1.status).equal(200);

        const report = getGovReportRes1.body.data[0];
        expect(report._id).to.be.an('string');
        expect(report.name).equal('gov-report');
        expect(report.calculations).to.be.an('array');
        expect(report.calculations.length).equal(2);
    })


    it('should get the gov-report result', async () => {
        // get company
        const getCompanyRes1 = await request(app).get(`/company`)
            .set('Authorization', `Bearer ${superAdminJwt}`);
        expect(getCompanyRes1.status).equal(200);
        const company = getCompanyRes1.body.data[0];

        // download the report
        const getGovReportRes1 = await request(app).get(`/${path}/gov-report/company/${company._id}/financialYear/${company.yearEnd}?format=json`)
            .set('Authorization', `Bearer ${superAdminJwt}`);

        expect(getGovReportRes1.status).equal(200);
        expect(getGovReportRes1.body.data).to.be.an('array');
        expect(getGovReportRes1.body.data.length).equal(2);

        const govReportRow1 = getGovReportRes1.body.data[0];
        expect(govReportRow1.name).equal('test countif calculation');
        expect(govReportRow1.uniqueId).equal('test-countif-calculation');
        expect(govReportRow1.result).equal(1);
        expect(govReportRow1.unit).equal('m');

        const envReportRow2 = getGovReportRes1.body.data[1];
        expect(envReportRow2.name).equal('test countif calculation 2');
        expect(envReportRow2.uniqueId).equal('test-countif-calculation-2');
        expect(envReportRow2.result).equal(3 + 2 + 2);
        expect(envReportRow2.unit).equal('m');
    })


    it('should create soc-report with empty calculation and get soc-report', async () => {
        const postReportRes1 = await request(app).post(`/${path}`)
            .set('Authorization', `Bearer ${superAdminJwt}`)
            .send({
                name: 'soc-report',
                calculations: [],
            });
        expect(postReportRes1.status).equal(200);
        expect(postReportRes1.body.data).to.be.an('string');

        const getSocReportRes1 = await request(app).get(`/${path}/soc-report`)
            .set('Authorization', `Bearer ${superAdminJwt}`);
        expect(getSocReportRes1.status).equal(200);

        const report = getSocReportRes1.body.data[0];
        expect(report._id).to.be.an('string');
        expect(report.name).equal('soc-report');
        expect(report.calculations).to.be.an('array');
        expect(report.calculations.length).equal(0);
    })

    it('should update version of soc-report', async () => {
        const getSocReportRes1 = await request(app).get(`/${path}/soc-report`)
            .set('Authorization', `Bearer ${superAdminJwt}`);
        expect(getSocReportRes1.status).equal(200);

        const oldSocReport = getSocReportRes1.body.data[0];
        expect(oldSocReport._id).to.be.an('string');

        // create calculation
        const getMaterialRes1 = await request(app).get(`/material`)
            .set('Authorization', `Bearer ${superAdminJwt}`);
        const matrixMaterial = getMaterialRes1.body.data[1];
        const getMaterialPointerRes1 = await request(app).get(`/material/${matrixMaterial._id}/pointer`)
            .set('Authorization', `Bearer ${superAdminJwt}`);

        const postCalculationRes1 = await request(app).post(`/calculation`)
            .set('Authorization', `Bearer ${superAdminJwt}`)
            .send({
                name: 'test countif calculation 3',
                uniqueId: 'test-countif-calculation-3',
                unit: 'm',
                expression: [
                    {
                        ...getMaterialPointerRes1.body.data[11],
                        payload: {
                            search: 'name 1'
                        }
                    },
                ]
            });
        expect(postCalculationRes1.status).equal(200);
        expect(postCalculationRes1.body.data).to.be.an('string');

        // update
        const postReportRes1 = await request(app).post(`/${path}`)
            .set('Authorization', `Bearer ${superAdminJwt}`)
            .send({
                name: 'soc-report',
                calculations: [postCalculationRes1.body.data],
            });
        expect(postReportRes1.status).equal(200);
        expect(postReportRes1.body.data).equal(true);

        const getSocReportRes2 = await request(app).get(`/${path}/soc-report`)
            .set('Authorization', `Bearer ${superAdminJwt}`);
        expect(getSocReportRes2.status).equal(200);

        const newSocReport = getSocReportRes2.body.data[0];
        expect(newSocReport._id).equal(oldSocReport._id);
        expect(newSocReport.calculations).to.be.an('array');
        expect(newSocReport.calculations.length).equal(1);
    })

    it('should use calculation pointer in the report', async () => {
        // get calculations
        const res1 = await request(app).get(`/calculation`)
            .set('Authorization', `Bearer ${superAdminJwt}`);
        expect(res1.status).equal(200);

        const calculation = res1.body.data[0];

        // get calculation pointer
        const getCalculationPointerRes1 = await request(app).get(`/pointer/calculation/${calculation._id}`)
            .set('Authorization', `Bearer ${superAdminJwt}`);
        expect(getCalculationPointerRes1.status).equal(200);

        const calculationPointer = getCalculationPointerRes1.body.data[0];

        // use calculation pointer to create calculation
        const postCalculationRes1 = await request(app).post(`/calculation`)
            .set('Authorization', `Bearer ${superAdminJwt}`)
            .send({
                name: 'test calculation on calculation 1',
                uniqueId: 'test-calculation-on-calculation-1',
                unit: 'm',
                expression: [
                    calculationPointer,
                    {
                        "text": "*",
                        "method": "operator"
                    },
                    {
                        "text": "5",
                        "method": "number"
                    },
                ]
            });
        expect(postCalculationRes1.status).equal(200);
        expect(postCalculationRes1.body.data).to.be.an('string');

        // update report
        const postReportRes1 = await request(app).post(`/${path}`)
            .set('Authorization', `Bearer ${superAdminJwt}`)
            .send({
                name: 'soc-report',
                calculations: [postCalculationRes1.body.data],
            });
        expect(postReportRes1.status).equal(200);
        expect(postReportRes1.body.data).equal(true);

        // get company
        const getCompanyRes1 = await request(app).get(`/company`)
            .set('Authorization', `Bearer ${superAdminJwt}`);
        expect(getCompanyRes1.status).equal(200);
        const company = getCompanyRes1.body.data[0];

        // download the report
        const getSocReportRes1 = await request(app).get(`/${path}/soc-report/company/${company._id}/financialYear/${company.yearEnd}?format=json`)
            .set('Authorization', `Bearer ${superAdminJwt}`);
        expect(getSocReportRes1.status).equal(200);
        expect(getSocReportRes1.body.data).to.be.an('array');
        expect(getSocReportRes1.body.data.length).equal(1);

        const socReportRow1 = getSocReportRes1.body.data[0];
        expect(socReportRow1.name).equal('test calculation on calculation 1');
        expect(socReportRow1.uniqueId).equal('test-calculation-on-calculation-1');
        expect(socReportRow1.result).equal((123 + 100.23 * 1000) * 5);
        expect(socReportRow1.unit).equal('m');
    })

    it('should use calculation pointer recursively in the report', async () => {
        // get calculations
        const res1 = await request(app).get(`/calculation`)
            .set('Authorization', `Bearer ${superAdminJwt}`);
        expect(res1.status).equal(200);

        const calculation = res1.body.data[5];

        // get calculation pointer
        const getCalculationPointerRes1 = await request(app).get(`/pointer/calculation/${calculation._id}`)
            .set('Authorization', `Bearer ${superAdminJwt}`);
        expect(getCalculationPointerRes1.status).equal(200);

        const calculationPointer = getCalculationPointerRes1.body.data[0];

        // use calculation pointer to create calculation
        const postCalculationRes1 = await request(app).post(`/calculation`)
            .set('Authorization', `Bearer ${superAdminJwt}`)
            .send({
                name: 'test calculation on calculation 2',
                uniqueId: 'test-calculation-on-calculation-2',
                unit: 'm',
                expression: [
                    calculationPointer,
                    {
                        "text": "/",
                        "method": "operator"
                    },
                    {
                        "text": "2",
                        "method": "number"
                    },
                ]
            });
        expect(postCalculationRes1.status).equal(200);
        expect(postCalculationRes1.body.data).to.be.an('string');

        // update report
        const postReportRes1 = await request(app).post(`/${path}`)
            .set('Authorization', `Bearer ${superAdminJwt}`)
            .send({
                name: 'soc-report',
                calculations: [postCalculationRes1.body.data],
            });
        expect(postReportRes1.status).equal(200);
        expect(postReportRes1.body.data).equal(true);

        // get company
        const getCompanyRes1 = await request(app).get(`/company`)
            .set('Authorization', `Bearer ${superAdminJwt}`);
        expect(getCompanyRes1.status).equal(200);
        const company = getCompanyRes1.body.data[0];

        // download the report
        const getSocReportRes1 = await request(app).get(`/${path}/soc-report/company/${company._id}/financialYear/${company.yearEnd}?format=json`)
            .set('Authorization', `Bearer ${superAdminJwt}`);
        expect(getSocReportRes1.status).equal(200);
        expect(getSocReportRes1.body.data).to.be.an('array');
        expect(getSocReportRes1.body.data.length).equal(1);

        const socReportRow1 = getSocReportRes1.body.data[0];
        expect(socReportRow1.name).equal('test calculation on calculation 2');
        expect(socReportRow1.uniqueId).equal('test-calculation-on-calculation-2');
        expect(socReportRow1.result).equal((123 + 100.23 * 1000) * 5 / 2);
        expect(socReportRow1.unit).equal('m');
    })

    it('should update soc-report with constant pointer', async () => {
        // get constant
        const getConstantRes1 = await request(app).get(`/constant`)
            .set('Authorization', `Bearer ${superAdminJwt}`);
        expect(getConstantRes1.status).equal(200);
        expect(getConstantRes1.body.data).to.be.an('array');
        expect(getConstantRes1.body.data.length).equal(1);        

        const constant = getConstantRes1.body.data[0];

        // get constant pointer
        const getConstantPointerRes1 = await request(app).get(`/pointer/constant/${constant._id}`)
            .set('Authorization', `Bearer ${superAdminJwt}`);
        expect(getConstantPointerRes1.status).equal(200);
        expect(getConstantPointerRes1.body.data).to.be.an('array');
        expect(getConstantPointerRes1.body.data.length).equal(1);

        const constantPointer = getConstantPointerRes1.body.data[0];
        
        // get calculations
        const getCalculationRes1 = await request(app).get(`/calculation`)
            .set('Authorization', `Bearer ${superAdminJwt}`);
        expect(getCalculationRes1.status).equal(200);

        const calculation1 = getCalculationRes1.body.data[5];

        // get calculation pointer
        const getCalculationPointerRes1 = await request(app).get(`/pointer/calculation/${calculation1._id}`)
            .set('Authorization', `Bearer ${superAdminJwt}`);
        expect(getCalculationPointerRes1.status).equal(200);

        const calculationPointer = getCalculationPointerRes1.body.data[0];

        // use calculation pointer & constant pointer to create calculation
        const postCalculationRes1 = await request(app).post(`/calculation`)
            .set('Authorization', `Bearer ${superAdminJwt}`)
            .send({
                name: 'test calculation on calculation 3',
                uniqueId: 'test-calculation-on-calculation-3',
                unit: 'm',
                expression: [
                    calculationPointer,
                    {
                        "text": "/",
                        "method": "operator"
                    },
                    {
                        "text": "2",
                        "method": "number"
                    },
                    {
                        "text": "+",
                        "method": "operator"
                    },
                    constantPointer,
                ]
            });
        expect(postCalculationRes1.status).equal(200);
        expect(postCalculationRes1.body.data).to.be.an('string');
        
        // update report
        const postReportRes1 = await request(app).post(`/${path}`)
            .set('Authorization', `Bearer ${superAdminJwt}`)
            .send({
                name: 'soc-report',
                calculations: [postCalculationRes1.body.data],
            });
        expect(postReportRes1.status).equal(200);
        expect(postReportRes1.body.data).equal(true);

        // get company
        const getCompanyRes1 = await request(app).get(`/company`)
            .set('Authorization', `Bearer ${superAdminJwt}`);
        expect(getCompanyRes1.status).equal(200);
        const company = getCompanyRes1.body.data[0];        

        const getSocReportRes1 = await request(app).get(`/${path}/soc-report/company/${company._id}/financialYear/${company.yearEnd}?format=json`)
            .set('Authorization', `Bearer ${superAdminJwt}`);
        expect(getSocReportRes1.status).equal(200);

        const socReportRow1 = getSocReportRes1.body.data[0];
        expect(socReportRow1.name).equal('test calculation on calculation 3');
        expect(socReportRow1.uniqueId).equal('test-calculation-on-calculation-3');
        expect(socReportRow1.result).equal((123 + 100.23 * 1000) * 5 / 2 + 2.36);
        expect(socReportRow1.unit).equal('m');
    })

    it('should have 7 edit report log', async () => {
        const result = await mongoose.model('user_activity_logs').find({
            resource: 'report',
            action: 'edit'
        }).exec()
        expect(result.length).equal(7);
    })

    it('should have 6 export report log', async () => {
        const result = await mongoose.model('user_activity_logs').find({
            resource: 'report',
            action: 'export'
        }).exec()
        expect(result.length).equal(6);
    })

    after(async () => {
        await shutdown();
    });
})