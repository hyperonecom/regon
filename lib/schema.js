'use strict';
const builder = require('xmlbuilder');
const parse = require('./parse');


const pad = (str, expected_length, pad_string=' ') => pad_string.repeat(expected_length - str.length) + str;

const normalize_postcode = (code) => {
    const text = String(code);
    return `${pad(text, 5, '0').substring(0, 2)  }-${  pad(text, 5, '0').substring(5, 2)}`;
};

const get_report_type = (typ, silosID) => {
    const report_type = {
        F: {
            1: 'BIR11OsFizycznaDzialalnoscCeidg',
            2: 'BIR11OsFizycznaDzialalnoscRolnicza',
            3: 'BIR11OsFizycznaDzialalnoscPozostala',
            4: 'BIR11OsFizycznaDzialalnoscSkreslonaDo20141108',
        },
        LF: 'BIR11JednLokalnaOsFizycznej',
        P: 'BIR11OsPrawna',
        LP: 'BIR11JednLokalnaOsPrawnej',
    };
    const result = report_type[typ];
    if (typeof result !== 'string') {
        return result[silosID];
    }
    return result;
};


module.exports.ZalogujRequest = apikey => builder.create('soap:Envelope', null, null, {headless: true})
    .att('xmlns:soap', 'http://www.w3.org/2003/05/soap-envelope')
    .att('xmlns:ns', 'http://CIS/BIR/PUBL/2014/07')
    .ele('soap:Header')
    .att('xmlns:wsa', 'http://www.w3.org/2005/08/addressing')
    .ele('wsa:Action', 'http://CIS/BIR/PUBL/2014/07/IUslugaBIRzewnPubl/Zaloguj').up()
    .ele('wsa:To', 'https://wyszukiwarkaregontest.stat.gov.pl/wsBIR/UslugaBIRzewnPubl.svc').up()
    .up()
    .ele('soap:Body')
    .ele('ns:Zaloguj')
    .ele('ns:pKluczUzytkownika', apikey)
    .end({pretty: true});


module.exports.ZalogujResponse = async content => {
    const xml = await parse(content);

    return xml['s:Envelope']['s:Body'][0].ZalogujResponse[0].ZalogujResult[0];
};


module.exports.SzukajRequest = (value, type) => builder.create('soap:Envelope', null, null, {headless: true})
    .att('xmlns:soap', 'http://www.w3.org/2003/05/soap-envelope')
    .att('xmlns:ns', 'http://CIS/BIR/PUBL/2014/07')
    .att('xmlns:dat', 'http://CIS/BIR/PUBL/2014/07/DataContract')
    .ele('soap:Header')
    .att('xmlns:wsa', 'http://www.w3.org/2005/08/addressing')
    .ele('wsa:Action', 'http://CIS/BIR/PUBL/2014/07/IUslugaBIRzewnPubl/DaneSzukajPodmioty').up()
    .ele('wsa:To', 'https://wyszukiwarkaregontest.stat.gov.pl/wsBIR/UslugaBIRzewnPubl.svc').up()
    .up()
    .ele('soap:Body')
    .ele('ns:DaneSzukajPodmioty')
    .ele('ns:pParametryWyszukiwania')
    .ele(`dat:${type}`, value)
    .end({pretty: true});


module.exports.SzukajResponse = async (content) => {
    const xml = await parse(content);
    const dane = xml['s:Envelope']['s:Body'][0].DaneSzukajPodmiotyResponse[0].DaneSzukajPodmiotyResult[0];
    if (!dane) {
        return undefined;
    }
    const result = (await parse(dane)).root.dane[0];
    if (result.ErrorCode) {
        const err = new Error(result.ErrorMessagePl[0]);
        err.code = result.ErrorCode[0];
        throw err;
    }
    const final_result = {};
    let key;
    let value;
    for ([key, value] of Object.entries(result)) {
        final_result[key] = value[0];
    }
    return {
        name: final_result.Nazwa,
        nip: final_result.Nip,
        regon14: final_result.Regon,
        voivodeship: final_result.Wojewodztwo,
        community: final_result.Powiat,
        county: final_result.Gmina,
        city: final_result.Miejscowosc,
        postal_code: final_result.KodPocztowy,
        street: final_result.Ulica,
        type: final_result.Typ,
        silos: final_result.SilosID,
        full_report: get_report_type(final_result.Typ, final_result.SilosID),
    };
};

module.exports.PelnyRaportRequest = (regon, report_name) => builder.create('soap:Envelope', null, null, {headless: true})
    .att('xmlns:soap', 'http://www.w3.org/2003/05/soap-envelope')
    .att('xmlns:ns', 'http://CIS/BIR/PUBL/2014/07')
    .ele('soap:Header')
    .att('xmlns:wsa', 'http://www.w3.org/2005/08/addressing')
    .ele('wsa:Action', 'http://CIS/BIR/PUBL/2014/07/IUslugaBIRzewnPubl/DanePobierzPelnyRaport').up()
    .ele('wsa:To', 'https://wyszukiwarkaregontest.stat.gov.pl/wsBIR/UslugaBIRzewnPubl.svc').up()
    .up()
    .ele('soap:Body')
    .ele('ns:DanePobierzPelnyRaport')
    .ele('ns:pRegon', regon).up()
    .ele('ns:pNazwaRaportu', report_name).up()
    .end({pretty: true});

const nvl = (item, defaultValue) => item ? item[0] : defaultValue;

module.exports.PelnyRaportResponse = async (content) => {
    const xml = await parse(content);
    const dane = xml['s:Envelope']['s:Body'][0].DanePobierzPelnyRaportResponse[0].DanePobierzPelnyRaportResult[0];
    const body = (await parse(dane)).root.dane[0];
    let postal_code = body.praw_adSiedzKodPocztowy ? normalize_postcode(body.praw_adSiedzKodPocztowy[0]) : null;
    if (!postal_code && body.fiz_adSiedzKodPocztowy) {
        postal_code = normalize_postcode(body.fiz_adSiedzKodPocztowy[0]);
    }
    const regon14 = nvl(body.praw_regon14, nvl(body.fiz_regon14, null));
    const regon9 = nvl(body.praw_regon9, nvl(body.fiz_regon9, null));
    return {
        name: nvl(body.praw_nazwa, nvl(body.fiz_nazwa, null)),
        nip: nvl(body.praw_nip, null),
        regon14: regon14,
        regon9: regon9,
        regon: regon14 ? regon14 : regon9,
        postal_code: postal_code,
        city: nvl(body.praw_adSiedzMiejscowosc_Nazwa, nvl(body.fiz_adSiedzMiejscowosc_Nazwa, null)),
        voidoeship: nvl(body.praw_adSiedzWojewodztwo_Nazwa, nvl(body.fiz_adSiedzWojewodztwo_Nazwa, null)),
        community: nvl(body.praw_adSiedzPowiat_Nazwa, nvl(body.fiz_adSiedzPowiat_Nazwa, null)),
        county: nvl(body.praw_adSiedzGmina_Nazwa, nvl(body.fiz_adSiedzGmina_Nazwa, null)),
        street: nvl(body.praw_adSiedzUlica_Nazwa, nvl(body.fiz_adSiedzUlica_Nazwa, null)),
        house_no: nvl(body.praw_adSiedzNumerNieruchomosci, nvl(body.fiz_adSiedzNumerNieruchomosci, null)),
        flaat_no: nvl(body.praw_adSiedzNumerLokalu, nvl(body.fiz_adSiedzNumerLokalu, null)),
        teryt: nvl(body.praw_adSiedzMiejscowosc_Symbol, nvl(body.fiz_adSiedzMiejscowosc_Symbol, null)),
    };
};
