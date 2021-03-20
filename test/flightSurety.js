const Test = require('../config/testConfig.js');
const truffleAssert = require('truffle-assertions');
const BN = require('bn.js');

let INITIAL_FUND = 0;
let MAX_INSURANCE_POLICY = 0;

contract('Flight Surety Tests', async (accounts) => {

    let config;
    before('setup contract', async () => {
        config = await Test.Config(accounts);
        await config.flightSuretyData.authorizeCaller(config.flightSuretyApp.address);
        INITIAL_FUND = await config.flightSuretyData.AIRLINE_MIN_FUNDS.call();
        MAX_INSURANCE_POLICY = await config.flightSuretyData.MAX_INSURANCE_POLICY.call();
        console.log("config", config.firstAirline)
        await config.flightSuretyApp.sendTransaction({from: config.firstAirline, value: INITIAL_FUND});
        await config.flightSuretyApp.registerAirline('Root Air', config.firstAirline, {from: config.owner});
    });

 
    it(`(multiparty) has correct initial isOperational() value`, async function () {

        // Get operating status
        let status = await config.flightSuretyData.isOperational.call();
        assert.equal(status, true, "Incorrect initial operating status value");

    });

    it(`(multiparty) can block access to setOperatingStatus() for non-Contract Owner account`, async function () {

        // Ensure that access is denied for non-Contract Owner account
        let accessDenied = false;
        try {
            await config.flightSuretyData.setOperatingStatus(false, {from: config.testAddresses[2]});
        } catch (e) {
            accessDenied = true;
        }
        assert.equal(accessDenied, true, "Access not restricted to Contract Owner");

    });

    it(`(multiparty) can allow access to setOperatingStatus() for Contract Owner account`, async function () {

        // Ensure that access is allowed for Contract Owner account
        let accessDenied = false;
        try {
            await config.flightSuretyData.setOperatingStatus(false);
        } catch (e) {
            accessDenied = true;
        }
        assert.equal(accessDenied, false, "Access not restricted to Contract Owner");

    });

    it(`(multiparty) can block access to functions using requireIsOperational when operating status is false`, async function () {

        await config.flightSuretyData.setOperatingStatus(false);

        let reverted = false;
        try {
            await config.flightSurety.setTestingMode(true);
        } catch (e) {
            reverted = true;
        }
        assert.equal(reverted, true, "Access not blocked for requireIsOperational");

        // Set it back for other tests to work
        await config.flightSuretyData.setOperatingStatus(true);

    });

    it('(airline) cannot register an Airline using registerAirline() if it is not funded', async () => {
        let newAirline = accounts[2];
        let failAirline = accounts[49];
        try {
            await config.flightSuretyApp.registerAirline("Benzoid", newAirline, {from: config.firstAirline});
        } catch (e) {

        }
        let result = await config.flightSuretyData.isAirlineRegistered.call(newAirline);
        assert.equal(result, true, "Airline should be registered");
        result = await config.flightSuretyData.isAirlineFunded.call(newAirline);
        assert.equal(result, false, "Airline should not be funded");
        try {
            await config.flightSuretyApp.registerAirline("Fail Airline", failAirline, {from: newAirline});
        } catch (e) {
        }
        result = await config.flightSuretyData.isAirlineRegistered.call(failAirline);
        assert.equal(result, false, "Unfunded airline should not be able to register new airline");
    });

    it("First airline is registered when contract is deployed", async () => {
        let result = await config.flightSuretyData.isAirlineRegistered.call(config.firstAirline);
        assert.equal(result, true, "First Airline should always be registered");
    });

    it("Only existing airline may register a new airline until there are at least four airlines registered", async () => {
        const account_offset = 4; // start with 3 because  1 and 2 are already in use (use clean address)
        const max_airlines = 2; // four minus two which are already registered

        for (let i = 0; i < max_airlines; ++i) {
            try {
                await config.flightSuretyApp.sendTransaction({from: accounts[i + account_offset], value: INITIAL_FUND});
                await config.flightSuretyApp.registerAirline("My Airline", accounts[i + account_offset], {from: config.firstAirline});
            } catch (e) {
                console.log(e)
            }
            let result = await config.flightSuretyData.isAirlineRegistered.call(accounts[i + account_offset]);
            assert.equal(result, i < max_airlines, "Airline should not be able to register another airline until there are at least four airlines registered");
        }
    });

    // it("Registration of fifth and subsequent airlines requires multi-party consensus of 50% of registered airlines", async () => {
    //     const account_offset = 6; // account_offset + max_airlines of previous test (aligned)
    //     const vote_offset = 4; // account_offset of previous test
    //     const max_airlines = 10;

    //     for (let i = 0; i < max_airlines; i++) {
    //         await config.flightSuretyApp.sendTransaction({from: accounts[i + account_offset], value: INITIAL_FUND});
    //         let count = new BN(await config.flightSuretyData.getAirlineCount.call());
    //         let votes_needed = Math.ceil(count / 2);
    //         for (let k = 0; k < votes_needed; ++k) {
    //             try {
    //                 await config.flightSuretyApp.registerAirline("My Airline", accounts[i + account_offset], {from: accounts[k + vote_offset]});
    //             } catch (e) {
    //                 console.log(e)
    //             }
    //             let result = await config.flightSuretyData.isAirlineRegistered.call(accounts[i + account_offset]);
    //             assert.equal(result, k === (votes_needed - 1), "multi-party consensus failed");
    //         }
    //     }
    // });

    it("Airline can be registered, but does not participate in contract until it submits funding of 10 ether", async () => {
        //see previous tests
        let unfunded_airline = accounts[2];
        let new_airline = accounts[97];
        let funded = await config.flightSuretyData.isAirlineFunded.call(unfunded_airline);
        assert.equal(funded, false, "Airline should be unfunded");
        let pass;
        try {
            await config.flightSuretyApp.registerAirline("New airline", new_airline, {from: unfunded_airline});
            pass = true;
        } catch (e) {
            pass = false;
        }
        assert.equal(pass, false, "Airline should not be able to participate without funding");

    });

    it("Register Flight", async () => {

     
            let airline = accounts[3];
            let name = "Kodaline";
            let timestamp = 11223344;
            await config.flightSuretyApp.sendTransaction({from: airline, value: INITIAL_FUND});
            let funded = await config.flightSuretyData.isAirlineFunded.call(airline);
            assert.equal(funded, true, "Airline should be funded");
            let reg = await config.flightSuretyData.isFlightRegistered(name, timestamp, airline, {from: airline});
            assert.equal(reg, false, "Flight is already registered");
            await config.flightSuretyApp.registerFlight(name, timestamp, airline, {from: airline});
            let pass = await config.flightSuretyData.isFlightRegistered(name, timestamp, airline, {from: airline});
            assert.equal(pass, true, "Airline should be able to Register a flight");


    });

    it("Passengers may pay up to 1 ether for purchasing flight insurance.", async () => {
        const flight1 = config.firstAirline;
        let amount = web3.utils.toWei("1", "ether");
        let customer = accounts[9]
        let failed = false;
    
        try {
            await config.flightSuretyApp.buyInsurance(
                flight1.airline,
                flight1.flight,
                flight1.timestamp,
                { from: customer, value: amount }
            );
        } catch(err) {
            failed = true;
        }
    
        assert.equal(failed, true, "Passenger was able to purchase insurance of 1 ether");
        
    });
    
    
    it('Passenger cannot buy more than 1 ether of insurance', async function () {
    
        const flight1 = config.firstAirline;
        let amount = web3.utils.toWei("1", "ether");
        amount = amount + amount;
        let customer = accounts[10]
        let failed = false;
    
        try {
            await config.flightSuretyApp.buyInsurance(
                flight1.airline,
                flight1.flight,
                flight1.timestamp,
                { from: customer, value: amount }
            );
        } catch(err) {
            failed = true;
        }
    
        assert.equal(failed, true, "Passenger was able to purchase insurance of more than 1 ether");
    });
    

});