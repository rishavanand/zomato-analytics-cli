#!/usr/bin/env node

import program from 'commander';
import { readUserInput } from './util';
import Zomato from './Zomato';
const { description, version } = require('../package.json');

program
    .action(async () => {
        try {

            console.log('Welcome to zomato-analytics-cli\n\nThis command line tool analyze your orders from https://www.zomato.com.\n');

            // Initialize new Zomato object
            const zomato: Zomato = new Zomato();
            await zomato.init();

            // Request OTP on email address
            const emailId = await readUserInput('Enter Zomato registered email address: ');
            await zomato.getOTP(emailId);

            // Request OTP verification
            const otp = await readUserInput('Enter OTP sent on your Zomato registered email address: ', true);
            await zomato.verifyOTP(otp);

            // Print wait message
            console.log('\nPlease wait while we fetch your orders...');

            // Fetch order history
            await zomato.fetchOrders();

            // Visualize stats
            await zomato.visualizeOrderStats();

        } catch (err) {
            console.error('Error: ' + err.message);
        }
    })

program
    .description(description)
    .version(version, '-v, --version')
    .parse(process.argv)