'use strict';
const parseString = require('xml2js').parseString;

module.exports = (content) => new Promise((resolve, reject) => {
    parseString(content, (err, result) => {
        if (err) return reject(err);
        return resolve(result);
    });
});
