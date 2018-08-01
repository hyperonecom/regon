const https = require('https');
const schema = require('./schema');

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
            return reject(matches)
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
            'Content-Type': 'application/soap+xml; charset=utf-8'
        }
    };
    const set_session_id = (sid) => options.headers['sid'] = sid;
    return {
        set_session_id: set_session_id,
        login: async (api_key) => {
            const body = schema.ZalogujRequest(api_key);
            const content = await request(options, body);
            const sid = await schema.ZalogujResponse(content);
            if(!sid){
                throw new Error("unable to obtain 'sid'. Invalid token?")
            }
            set_session_id(sid);
            return sid;
        },
        search_regon: async (regon) => {
            const body = schema.SzukajRequest(regon, "Regon");
            const content = await request(options,body);
            return schema.SzukajResponse(content)
        },
        search_nip: async (nip) => {
            const body = schema.SzukajRequest(nip, "Nip");
            const content = await request(options,body);
            return schema.SzukajResponse(content)
        },
        report: async (regon, type) => {
            const body = schema.PelnyRaportRequest(regon, type);
            const content = await request(options, body);
            return schema.PelnyRaportResponse(content);
        }
    }
};

