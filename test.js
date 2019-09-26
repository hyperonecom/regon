'use strict';
const ava = require('ava');
const bir = require('./index');


const test_nip_entity = {
    5213621697: 'Ministerstwo Cyfryzacji',
    6911051353: 'NZOZ (JDG)',
};

Object.keys(test_nip_entity).forEach(nip => {
    // BIR reject login twice at the same time.
    ava.test.serial(`Test NIP handling ${test_nip_entity[nip]} (${nip})`, async t => {
        t.true(!!process.env.GUS_API_KEY, 'Environment variable GUS_API_KEY with production API-key are required.');
        const required_fields = ['name', 'nip', 'regon', 'postal_code',
            'voidoeship', 'community', 'county', 'city', 'street', 'house_no', 'flaat_no'];
        const client = bir(true);
        await client.login(process.env.GUS_API_KEY);
        const entity = await client.search_nip(nip);
        const report = await client.report(entity.regon14);
        for (const field of required_fields) {
            t.true(!!report[field], `Missing field ${field}`);
        }
    });
});
