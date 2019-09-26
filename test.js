'use strict';

const ava = require('ava');
const bir = require('.');

const test_nip_entity = {
    5262596640: {
        city: 'Warszawa',
        community: 'm. st. Warszawa',
        county: 'Mokotów',
        flaat_no: '',
        house_no: '21',
        name: 'GŁÓWNY INSPEKTORAT TRANSPORTU DROGOWEGO',
        nip: '5262596640',
        postal_code: '02-676',
        regon: '017427604',
        regon14: '017427604',
        regon9: '017427604',
        street: 'ul. Test-Krucza',
        teryt: '0918130',
        voidoeship: 'MAZOWIECKIE',
    },
    6911051353: {
        name: 'Przychodnia Stomatologiczna "VITADENT" Niepubliczny Zakład Opieki Zdrowotnej Jerzy XXXXXXXX',
        nip: '6911051353',
        regon14: '390151863',
        regon9: '390151863',
        regon: '390151863',
        postal_code: '59-220',
        city: 'Legnica',
        voidoeship: 'DOLNOŚLĄSKIE',
        community: 'm. Legnica',
        county: 'M. Legnica',
        street: 'ul. Test-Wilcza',
        house_no: '9',
        flaat_no: '1',
        teryt: '0954047',
    },
};

Object.entries(test_nip_entity).forEach(([nip, expect]) => {
    // BIR reject login twice at the same time.
    ava.serial(`Test NIP handling ${expect.name} (${nip})`, async t => {
        const client = bir(process.env.GUS_ENV === 'production');
        await client.login(process.env.GUS_API_KEY || 'abcde12345abcde12345');
        const entity = await client.search_nip(nip);
        const report = await client.report(entity.regon14, entity.full_report);
        t.deepEqual(report, expect);
    });
});
