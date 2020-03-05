import fetch, { Response } from 'node-fetch';
import { parseCookies, monthNames, printBars, weekdayNames } from './util';
import cheerio from 'cheerio';
import md5 from 'md5';
import { ICookieMap, IOTP, ILoginRespose, IOrder } from './entities';
import chalk from 'chalk';

export default class Zomato {

    private PHPSESSID: string | undefined;
    private CSRF: string | undefined;
    private homePage: string = 'https://www.zomato.com';
    private email: string | undefined;
    private orders: IOrder[] = [];
    userFirstName: string | undefined;
    userLastName: string | undefined;
    userId: number | undefined;

    /**
     * Create browser instance and fetch cookies
     */
    async init(): Promise<void> {

        // Make request to get cookies
        const res: Response = await fetch(this.homePage, {
            method: 'GET',
            headers: {
                'Host': 'www.zomato.com',
                'Origin': 'www.zomato.com',
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.122 Safari/537.36'
            }
        });
        const cookieString: string | null = res.headers.get('set-cookie');
        if (cookieString === null)
            throw new Error('Set cookie header not present in request');

        // Parse cookies
        const cookies: ICookieMap = parseCookies(cookieString);

        // Store important cookies
        this.PHPSESSID = cookies.PHPSESSID.value;
        this.CSRF = cookies.csrf.value;

    }

    /**
     * Request OTP on registered email address
     * @param email Registered email address
     */
    async getOTP(email: string): Promise<void> {

        // Store email
        this.email = email;

        // Make OTP request
        const res: Response = await fetch('https://www.zomato.com/php/get_login_otp.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Cookie': 'PHPSESSID=' + this.PHPSESSID,
                'Host': 'www.zomato.com',
                'Origin': 'www.zomato.com',
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.122 Safari/537.36'
            },
            body: `login_id=${email}&csrf_token=${this.CSRF}`
        });
        const resJSON: IOTP = await res.json();

        // Check for errors
        if (resJSON.status !== 'success')
            throw new Error(resJSON.message)
    }

    /**
     * Make verification request with OTP
     * @param otp Received OTP
     */
    async verifyOTP(otp: string): Promise<void> {

        // Make OTP request
        const res: Response = await fetch('https://www.zomato.com/php/asyncLogin.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Cookie': 'PHPSESSID=' + this.PHPSESSID,
                'Host': 'www.zomato.com',
                'Origin': 'www.zomato.com',
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.122 Safari/537.36'
            },
            body: `login=${this.email}&otp=${otp}&csrf_token=${this.CSRF}`
        });
        const resJSON: ILoginRespose = await res.json();

        // Check for errors
        if (resJSON.status !== 'true')
            throw new Error(resJSON.message);

        // Get new cookies :D
        const cookieString: string | null = res.headers.get('set-cookie');
        if (cookieString === null)
            throw new Error('Set cookie header not present in request');

        // Parse cookies
        const cookies: ICookieMap = parseCookies(cookieString);

        // Store important cookies
        this.PHPSESSID = cookies.PHPSESSID.value;
        this.CSRF = cookies.csrf.value;

        // Store user info
        [this.userFirstName, this.userLastName] = resJSON.name.split(' ');
        this.userId = resJSON.user_id;

    }

    /**
     * Fetch and organize orders
     */
    async fetchOrders(): Promise<void> {

        // Make request
        const res: Response = await fetch(this.homePage + `/php/filter_user_tab_content.php`, {
            method: 'POST',
            redirect: 'follow',
            headers: {
                'Host': 'www.zomato.com',
                'Origin': 'www.zomato.com',
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.122 Safari/537.36',
                'Cookie': 'PHPSESSID=' + this.PHPSESSID,
            },
            body: `user_id=${this.userId}&tab=ordering&order_history_offset=0&order_history_limit=10000`

        });
        const resJSON: any = await res.json();

        // Check for errors
        if (resJSON.status !== 'success')
            throw new Error(resJSON.message);

        // Organize orders
        const orders: IOrder[] = this.extractOrders(resJSON.html);

        // Store
        this.orders = orders;

    }

    /**
     * Convert html orders to structured JSON array
     * @param html Orders data
     */
    extractOrders(html: string): IOrder[] {

        const orders: IOrder[] = [];

        // Initialize html parser
        const $: CheerioStatic = cheerio.load(html);
        const ordersElement: Cheerio = $('.order-history-snippet');

        // Extract info for each order
        ordersElement.each((i: number, element: CheerioElement) => {

            const status: string = $(element).children().find('.checkmark').next().text().trim();
            const restaurant: string = $(element).children().find('.header').children().text().trim();
            const city: string = $(element).children().find('.header').next().text().trim();
            const orderNumber: string = $(element).children().find('.order-number').text().trim().split(':')[1].trim();
            const cost: string = $(element).children().find('.cost').text().trim().slice(1);
            const date: string = $(element).children().find('.rating').next().text().trim();

            // Structure and append extracted info into JSON array
            orders.push({
                status: status,
                restaurant: restaurant,
                restaurantId: md5(restaurant),
                city: city,
                orderNumber: parseFloat(orderNumber),
                cost: parseFloat(cost),
                date: new Date(date)
            });

        });

        return orders;
    }

    /**
     * Print all visualizations
     */
    visualizeOrderStats(): void {

        const orders: IOrder[] = this.orders;

        // Filter delivered orders
        const deliveredOrders: IOrder[] = orders.filter(o => o.status === 'Delivered');

        console.log()

        // Print total orders
        console.log('Your total delivered orders are: ' + chalk.cyanBright(deliveredOrders.length))

        console.log()

        // Print total amount spent
        console.log('You have spent a total sum of: ' + chalk.cyanBright('₹' + deliveredOrders.reduce((acc, item) => acc += item.cost, 0).toFixed(2)))

        console.log()

        // Print monthly stats
        console.log('Your spend and orders count distributed monthly in the last 10 months:')
        this.printMonthlyStats(deliveredOrders);

        console.log()

        // Print weekday stats
        console.log('Weekday wise distribution of your orders:')
        this.printWeekdayStats(deliveredOrders);

        console.log()

    }

    /**
     * Print bar graph with monthly order count
     * @param orders All delivered orders
     */
    printMonthlyStats(orders: IOrder[]): void {

        // Calculate monthly stats
        const monthlyStat: any = {};
        orders.map((order: IOrder) => {

            // Get month in words
            const orderDate: Date = order.date;
            const orderMonth: number = orderDate.getMonth();
            const orderMonthInWords: string = monthNames[orderMonth]

            // Get last 2 digits if year
            const year: number = orderDate.getFullYear() % 2000;

            // Generate key
            const key: string = `${orderMonthInWords}-${year}`;

            // Generate object
            if (!monthlyStat[key]) {
                // When key is not present in object, initialize
                monthlyStat[key] = {
                    count: 1,
                    total: order.cost
                }
            } else {
                // When key is present in the object, increment
                monthlyStat[key].count += 1;
                monthlyStat[key].total += order.cost;
            }
        });

        // Print bars
        printBars(monthlyStat);
    }

    /**
     * Print bar graph with weekday order count
     * @param orders All delivered orders
     */
    printWeekdayStats(orders: IOrder[]): void {

        // Calculate weekday stats
        const weekdayStat: any = {
            'Sunday': null,
            'Monday': null,
            'Tuesday': null,
            'Wednesday': null,
            'Thursday': null,
            'Friday': null,
            'Saturday': null
        };
        orders.map((order: IOrder) => {

            // Get month in words
            const orderDate: Date = order.date;
            const orderDay: number = orderDate.getDay();
            const orderDayInWords: string = weekdayNames[orderDay]

            // Generate key
            const key: string = orderDayInWords;

            // Generate object
            if (!weekdayStat[key]) {
                // When key is not present in object, initialize
                weekdayStat[key] = {
                    count: 1,
                    total: order.cost
                }
            } else {
                // When key is present in the object, increment
                weekdayStat[key].count += 1;
                weekdayStat[key].total += order.cost;
            }
        });

        // Print bars
        printBars(weekdayStat, false);
    }

    /**
     * Print bar graph with restaurant order count
     * @param orders All delivered orders
     */
    printRestaurantStats(orders: IOrder[]): void {

        // Calculate restaurant stats
        const restaurantStat: any = {};
        orders.map((order: IOrder) => {

            // Generate key
            const key: string = order.restaurant;

            // Generate object
            if (!restaurantStat[key]) {
                // When key is not present in object, initialize
                restaurantStat[key] = {
                    count: 1,
                    total: order.cost
                }
            } else {
                // When key is present in the object, increment
                restaurantStat[key].count += 1;
                restaurantStat[key].total += order.cost;
            }
        });

        // Print bars
        printBars(restaurantStat, false, true);
    }

}