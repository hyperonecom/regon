'use strict';
const https = require('https');
const schema = require('./lib/schema');

const request = (options, body) => new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
        let content = '';
        if (res.statusCode !== 200) return reject(res);
        res.on('error', reject);
        res.on('data', (d) => {
            content += d;
        });
        res.on('end', () => {
            const matches = content.match(/<.+?:Envelope.+?>([\s\S]+?)<\/.+?:Envelope>/g);
            if (matches) {
                return resolve(matches[0]);
            }
            return reject(matches);
        });
    });
    req.end(body);
});

module.exports = (production = false) => {
    const options = {
        hostname: production ? 'wyszukiwarkaregon.stat.gov.pl' : 'wyszukiwarkaregontest.stat.gov.pl',
        port: 443,
        path: '/wsBIR/UslugaBIRzewnPubl.svc',
        method: 'POST',
        headers: {
            'Content-Type': 'application/soap+xml; charset=utf-8',
        },
    };

    const client = {};

    client.set_session_id = (sid) => options.headers.sid = sid;

    client.login = async (api_key) => {
        const body = schema.ZalogujRequest(api_key);
        const content = await request(options, body);
        const sid = await schema.ZalogujResponse(content);
        if (!sid) {
            throw new Error("unable to obtain 'sid'. Invalid token?");
        }
        client.set_session_id(sid);
        return sid;
    };

    client.search_regon = async (regon) => {
        const body = schema.SzukajRequest(regon, 'Regon');
        const content = await request(options, body);
        return schema.SzukajResponse(content);
    };

    client.search_nip = async (nip) => {
        const body = schema.SzukajRequest(nip, 'Nip');
        const content = await request(options, body);
        return schema.SzukajResponse(content);
    };

    client.report = async (regon, type) => {
        const entity = await client.search_regon(regon);
        if (!entity) return null;
        const query_type = type || entity.full_report;
        const body = schema.PelnyRaportRequest(regon, query_type);
        const content = await request(options, body);
        const response = await schema.PelnyRaportResponse(content);
        return Object.assign({}, ...Object.keys(response).map(key =>
            ({[key]: response[key] == null ? entity[key] : response[key]})
        ));
    };

    return client;
};

