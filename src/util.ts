import { ICookie, ICookieMap, IBarPrinterInput, IBarPrinterParam } from "./entities";
import inquirer from 'inquirer';
import chalk from 'chalk';

/**
 * Convert header set cookie string into an object
 * @param cookieString Set cookie header string
 */
export const parseCookies = (cookieString: string): ICookieMap => {

    // Split string
    const cookieArray: string[] = cookieString.split(',');

    // Sub strings
    const cookieSubArray: string[][] = cookieArray.map(
        cookie => cookie.split(';').map(c => c.trim())
    );

    // Join date strings back to the parent cookie array
    const mergedCookieArray: string[][] = [];
    for (let i = 0; i < cookieSubArray.length; i++) {
        if (i + 1 < cookieSubArray.length && cookieSubArray[i + 1][0].search(/[0-9]/) === 0) {
            cookieSubArray[i][cookieSubArray[i].length - 1] += ', ' + cookieSubArray[i + 1][0];
            cookieSubArray[i + 1].splice(0, 1);
            mergedCookieArray.push(cookieSubArray[i].concat(cookieSubArray[i + 1]));
            i += 1;
        } else {
            mergedCookieArray.push(cookieSubArray[i]);
        }
    }

    // Convert to object
    const cookieObject: ICookieMap = {};
    mergedCookieArray.map(mergedCookie => {
        const keyValueArray: string[][] = mergedCookie.map(cookie => cookie.split('='))
        const singleCookieObject: any = {};
        keyValueArray.map(c => {
            if (c[0] == keyValueArray[0][0]) {
                singleCookieObject['name'] = keyValueArray[0][0];
                singleCookieObject['value'] = c[1];
            } else
                singleCookieObject[c[0]] = c[1] ? c[1] : true;
        })
        cookieObject[keyValueArray[0][0]] = <ICookie>singleCookieObject;
    });

    return cookieObject;
}

/**
 * Read input from user
 * @param question Question asked to the user for input
 */
export const readUserInput = async (question: string, isSensitive: Boolean = false): Promise<string> => {

    const answers = await inquirer.prompt([
        {
            name: 'key',
            message: question,
            type: isSensitive ? 'password' : 'input'
        },
    ])

    if (!answers.key)
        // When email address is invalid
        throw new Error('Invalid input.');
    else
        // When email address ia valid
        return answers.key;

}

// Month index to words
export const monthNames: string[] = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec"
];

// Weekday index to words
export const weekdayNames: string[] = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday"
];

/**
 * Print bars on console
 * @param data Values for printing
 * @param limit Max number of elements to print
 * @param width Max with of bar in the terminal
 */

export const printBars = (data: IBarPrinterParam, displayCost: Boolean = true, performSort: Boolean = false, limit: number = 10, width: number = 50) => {
    console.log('here')
    const block: string = '\u2580';

    // Convert object to 
    const labelValueArr: IBarPrinterInput[] = Object.keys(data).map(key => {
        return data[key] ? {
            label: key,
            value: data[key].total ? data[key].total : 0,
            count: data[key].count
        } : {
                label: key,
                value: 0,
                count: 0
            }
    });

    // Calculate max value for normalization
    const maxValue = Math.max(...labelValueArr.map(x => x.count));

    labelValueArr
        // Select max elements to display
        .slice(0, limit)
        // Reverse sort
        .sort((a: IBarPrinterInput, b: IBarPrinterInput) => performSort ? b.count - a.count : 0)
        // Print bars
        .forEach(({ label, value, count }) => {

            // Remove decimals
            const truncatedValue = Math.trunc(count);

            console.log(
                // Display initial white space
                ' '.repeat(1),
                // Display count
                chalk.whiteBright(truncatedValue),
                // Display white space depending on number of digits in count
                ' '.repeat(4 - String(truncatedValue).length),
                // Display bars with normalized values
                block.repeat(width * truncatedValue / maxValue),
                // Display key
                chalk.yellow(label),
                // Display cost
                chalk.red(displayCost ? '₹' + value.toFixed(0) : ''),
            );
        });
};