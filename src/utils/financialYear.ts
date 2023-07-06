import dayjs from "dayjs";

export function getDatesOfFinancialYear(year: number, yearEnd: string) {
    const yearStartObj = dayjs(yearEnd).subtract(1, 'year').add(1, 'day');

    return {
        year,
        startDate: yearStartObj.year(year).format('YYYY-MM-DD'),
        endDate: yearStartObj.year(year).add(1, 'year').subtract(1, 'day').format('YYYY-MM-DD'),
    }
}

export function getDateOfFinancialYearFromDate(date: string, yearEnd: string) {
    // date: YYYY-MM-DD

    const targetDateObj = dayjs(date);

    const yearEndObj = dayjs(yearEnd).year(targetDateObj.year())

    if (targetDateObj.isAfter(yearEndObj, 'day')) {
        const yearStartObj = dayjs(yearEnd).year(targetDateObj.year()).add(1, 'day');
        return {
            year: yearStartObj.year(),
            startDate: yearStartObj.format('YYYY-MM-DD'),
            endDate: yearEndObj.add(1, 'year').format('YYYY-MM-DD'),
        }
    } else {
        const yearStartObj = dayjs(yearEnd).year(targetDateObj.year() - 1).add(1, 'day');
        return {
            year: yearStartObj.year(),
            startDate: yearStartObj.format('YYYY-MM-DD'),
            endDate: yearEndObj.format('YYYY-MM-DD'),
        }
    }
}
