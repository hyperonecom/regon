const builder = require('xmlbuilder');
const parse = require('./parse');


const pad = (str, expected_length, pad_string=" ") => pad_string.repeat(expected_length - str.length) + str;

const normalize_postcode = (code) => {
    const text = String(code);
    return pad(text, 5, "0").substring(0, 2) + "-" + pad(text, 5, "0").substring(5, 2);
};

const get_report_type = (typ, silosID) => {
    const report_type = {
        'F': {
            1: 'PublDaneRaportDzialalnoscFizycznejCeidg',
            2: 'PublDaneRaportDzialalnoscFizycznejRolnicza',
            3: 'PublDaneRaportDzialalnoscFizycznejPozostala',
            4: 'PublDaneRaportDzialalnoscFizycznejWKrupgn'
        },
        'LF': 'PublDaneRaportLokalnaFizycznej',
        'P': 'PublDaneRaportPrawna',
        'LP': 'PublDaneRaportLokalnaPrawnej'
    };
    let result = report_type[typ];
    if (typeof typ !== "string") {
        return result[silosID];
    }
    return result;
};


module.exports.ZalogujRequest = apikey => builder.create('soap:Envelope', null, null, {headless: true})
    .att("xmlns:soap", "http://www.w3.org/2003/05/soap-envelope")
    .att("xmlns:ns", "http://CIS/BIR/PUBL/2014/07")
    .ele('soap:Header')
    .att("xmlns:wsa", "http://www.w3.org/2005/08/addressing")
    .ele("wsa:Action", "http://CIS/BIR/PUBL/2014/07/IUslugaBIRzewnPubl/Zaloguj").up()
    .ele("wsa:To", "https://wyszukiwarkaregontest.stat.gov.pl/wsBIR/UslugaBIRzewnPubl.svc").up()
    .up()
    .ele("soap:Body")
    .ele("ns:Zaloguj")
    .ele("ns:pKluczUzytkownika", apikey)
    .end({pretty: true});


module.exports.ZalogujResponse = async content => {
    const xml = await parse(content);

    return xml["s:Envelope"]['s:Body'][0]['ZalogujResponse'][0]['ZalogujResult'][0];
};


module.exports.SzukajRequest = (value, type) => builder.create('soap:Envelope', null, null, {headless: true})
    .att("xmlns:soap", "http://www.w3.org/2003/05/soap-envelope")
    .att("xmlns:ns", "http://CIS/BIR/PUBL/2014/07")
    .att("xmlns:dat", "http://CIS/BIR/PUBL/2014/07/DataContract")
    .ele('soap:Header')
    .att("xmlns:wsa", "http://www.w3.org/2005/08/addressing")
    .ele("wsa:Action", "http://CIS/BIR/PUBL/2014/07/IUslugaBIRzewnPubl/DaneSzukaj").up()
    .ele("wsa:To", "https://wyszukiwarkaregontest.stat.gov.pl/wsBIR/UslugaBIRzewnPubl.svc").up()
    .up()
    .ele("soap:Body")
    .ele("ns:DaneSzukaj")
    .ele("ns:pParametryWyszukiwania")
    .ele(`dat:${type}`, value)
    .end({pretty: true});


module.exports.SzukajResponse = async (content) => {
    const xml = await parse(content);
    const dane = xml['s:Envelope']['s:Body'][0]['DaneSzukajResponse'][0]['DaneSzukajResult'][0];
    if(!dane){
        return undefined;
    }
    const result = (await parse(dane))['root']['dane'][0];
    const final_result = {};
    for ([key, value] of Object.entries(result)) {
        final_result[key] = value[0];
    }
    return {
        name: final_result.Nazwa,
        regon14: final_result.Regon,
        voivodeship: final_result.Wojewodztwo,
        community: final_result.Powiat,
        county: final_result.Gmina,
        city: final_result.Miejscowosc,
        postal_code: final_result.KodPocztowy,
        street: final_result.Ulica,
        type: final_result.Typ,
        silso: final_result.SilosID,
        full_report: get_report_type(final_result['Typ'], final_result['SilosID'])
    }
};

module.exports.PelnyRaportRequest = (regon, report_name) => builder.create('soap:Envelope', null, null, {headless: true})
    .att("xmlns:soap", "http://www.w3.org/2003/05/soap-envelope")
    .att("xmlns:ns", "http://CIS/BIR/PUBL/2014/07")
    .ele('soap:Header')
    .att("xmlns:wsa", "http://www.w3.org/2005/08/addressing")
    .ele("wsa:Action", "http://CIS/BIR/PUBL/2014/07/IUslugaBIRzewnPubl/DanePobierzPelnyRaport").up()
    .ele("wsa:To", "https://wyszukiwarkaregontest.stat.gov.pl/wsBIR/UslugaBIRzewnPubl.svc").up()
    .up()
    .ele("soap:Body")
    .ele("ns:DanePobierzPelnyRaport")
    .ele("ns:pRegon", regon).up()
    .ele("ns:pNazwaRaportu", report_name).up()
    .end({pretty: true});

module.exports.PelnyRaportResponse = async (content) => {
    const xml = await parse(content);
    const dane = xml['s:Envelope']['s:Body'][0]['DanePobierzPelnyRaportResponse'][0]['DanePobierzPelnyRaportResult'][0];
    const body = (await parse(dane))['root']['dane'][0];
    return {
        name: body.praw_nazwa[0],
        nip: body.praw_nip[0],
        regon14: body.praw_regon14[0],
        postal_code: normalize_postcode(body.praw_adSiedzKodPocztowy[0]),
        city: body.praw_adSiedzMiejscowosc_Nazwa[0],
        voidoeship: body.praw_adSiedzWojewodztwo_Nazwa[0],
        community: body.praw_adSiedzPowiat_Nazwa[0],
        county: body.praw_adSiedzGmina_Nazwa[0],
        street: body.praw_adSiedzUlica_Nazwa[0],
        house_no: body.praw_adSiedzNumerNieruchomosci[0],
        flaat_no: body.praw_adSiedzNumerLokalu[0],
    }
};