import chai from 'chai';
import dayjs from "dayjs";

import { getDatesOfFinancialYear, getDateOfFinancialYearFromDate } from "../financialYear";

chai.should();
const expect = chai.expect;

describe('calculate financial year util', () => {
    it('should get correct dates of financial year from year & end date if end date is 12-31', () => {
        // test end date is 12-31
        const yearEnd = dayjs().year(2050).month(11).date(31);

        for (let year = 2020; year <= 2030; year++) {
            const currentYearStartDate = dayjs().year(year).month(0).date(1);
            const currentYearEndDate = dayjs().year(year).month(11).date(31);

            const result = getDatesOfFinancialYear(year, yearEnd.format('YYYY-MM-DD'));

            expect(result.year).equal(year);
            expect(result.startDate).equal(currentYearStartDate.format('YYYY-MM-DD'));
            expect(result.endDate).equal(currentYearEndDate.format('YYYY-MM-DD'));
        }
    })

    it('should get correct dates of financial year from year & end date if end date is 03-31', () => {
        // test end date is 03-31
        const yearEnd = dayjs().year(2030).month(2).date(31);

        for (let year = 2020; year <= 2030; year++) {
            const currentYearStartDate = dayjs().year(year).month(3).date(1);
            const currentYearEndDate = dayjs().year(year + 1).month(2).date(31);

            const result = getDatesOfFinancialYear(year, yearEnd.format('YYYY-MM-DD'));

            expect(result.year).equal(year);
            expect(result.startDate).equal(currentYearStartDate.format('YYYY-MM-DD'));
            expect(result.endDate).equal(currentYearEndDate.format('YYYY-MM-DD'));
        }
    })

    it('should get correct dates of financial year form date & end date if end date is 12-31', () => {
        // test end date is 12-31
        const yearEnd = dayjs().year(2000).month(11).date(31);

        for (let year = 2020; year <= 2030; year++) {
            // test with start & end date of every financial year
            const currentYearStartDate = dayjs().year(year).month(0).date(1);
            const currentYearEndDate = dayjs().year(year).month(11).date(31);

            const result = getDateOfFinancialYearFromDate(currentYearStartDate.format('YYYY-MM-DD'), yearEnd.format('YYYY-MM-DD'))
            expect(result.year).equal(year);
            expect(result.startDate).equal(currentYearStartDate.format('YYYY-MM-DD'));
            expect(result.endDate).equal(currentYearEndDate.format('YYYY-MM-DD'));

            const result2 = getDateOfFinancialYearFromDate(currentYearEndDate.format('YYYY-MM-DD'), yearEnd.format('YYYY-MM-DD'))
            expect(result2.year).equal(year);
            expect(result2.startDate).equal(currentYearStartDate.format('YYYY-MM-DD'));
            expect(result2.endDate).equal(currentYearEndDate.format('YYYY-MM-DD'));

            const currentYearBeforeDate = dayjs().year(year).month(6).date(1);
            const result3 = getDateOfFinancialYearFromDate(currentYearBeforeDate.format('YYYY-MM-DD'), yearEnd.format('YYYY-MM-DD'))
            expect(result3.year).equal(year);
            expect(result3.startDate).equal(currentYearStartDate.format('YYYY-MM-DD'));
            expect(result3.endDate).equal(currentYearEndDate.format('YYYY-MM-DD'));
        }
    })

    it('get correct dates of financial year form date & end date if end date is 03-31', () => {
        // test end date is 03-31
        const yearEnd = dayjs().year(2050).month(2).date(31);

        for (let year = 2020; year <= 2030; year++) {
            // test with start & end date of every financial year
            const currentYearStartDate = dayjs().year(year).month(3).date(1);
            const currentYearEndDate = dayjs().year(year + 1).month(2).date(31);

            const result = getDateOfFinancialYearFromDate(currentYearStartDate.format('YYYY-MM-DD'), yearEnd.format('YYYY-MM-DD'))
            expect(result.year).equal(year);
            expect(result.startDate).equal(currentYearStartDate.format('YYYY-MM-DD'));
            expect(result.endDate).equal(currentYearEndDate.format('YYYY-MM-DD'));

            const result2 = getDateOfFinancialYearFromDate(currentYearEndDate.format('YYYY-MM-DD'), yearEnd.format('YYYY-MM-DD'))
            expect(result2.year).equal(year);
            expect(result2.startDate).equal(currentYearStartDate.format('YYYY-MM-DD'));
            expect(result2.endDate).equal(currentYearEndDate.format('YYYY-MM-DD'));

            const currentYearBeforeDate = dayjs().year(year).month(0).date(1);
            const result3 = getDateOfFinancialYearFromDate(currentYearBeforeDate.format('YYYY-MM-DD'), yearEnd.format('YYYY-MM-DD'))
            expect(result3.year).equal(year - 1);
            expect(result3.startDate).equal(currentYearStartDate.subtract(1, 'year').format('YYYY-MM-DD'));
            expect(result3.endDate).equal(currentYearEndDate.subtract(1, 'year').format('YYYY-MM-DD'));

            const currentYearAfterDate = dayjs().year(year).month(6).date(1);
            const result4 = getDateOfFinancialYearFromDate(currentYearAfterDate.format('YYYY-MM-DD'), yearEnd.format('YYYY-MM-DD'))
            expect(result4.year).equal(year);
            expect(result4.startDate).equal(currentYearStartDate.format('YYYY-MM-DD'));
            expect(result4.endDate).equal(currentYearEndDate.format('YYYY-MM-DD'));

            const nextYearBeforeDate = dayjs().year(year + 1).month(0).date(1);
            const result5 = getDateOfFinancialYearFromDate(nextYearBeforeDate.format('YYYY-MM-DD'), yearEnd.format('YYYY-MM-DD'))
            expect(result5.year).equal(year);
            expect(result5.startDate).equal(currentYearStartDate.format('YYYY-MM-DD'));
            expect(result5.endDate).equal(currentYearEndDate.format('YYYY-MM-DD'));

            const nextYearAfterDate = dayjs().year(year + 1).month(6).date(1);
            const result6 = getDateOfFinancialYearFromDate(nextYearAfterDate.format('YYYY-MM-DD'), yearEnd.format('YYYY-MM-DD'))
            expect(result6.year).equal(year + 1);
            expect(result6.startDate).equal(currentYearStartDate.add(1, 'year').format('YYYY-MM-DD'));
            expect(result6.endDate).equal(currentYearEndDate.add(1, 'year').format('YYYY-MM-DD'));
        }
    })
})