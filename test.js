const bir = require('./index');

// Example usage:
// GUS_API_KEY="abcde12345abcde12345" nodejs test.js false regon "00033150100000"
// GUS_API_KEY="abcde12345abcde12345" nodejs test.js false nip "1181985157"
const main = async () => {
    if (process.argv.length < 3) {
        console.log(`Usage: ${process.argv[0]} [production=true/false] [nip/regon] [value]`);
        process.exit(2);
    }
    if (!process.env.GUS_API_KEY) {
        console.log("Missing environment variable 'GUS_API_KEY'");
        process.exit(3);

    }
    const production = JSON.parse(process.argv[2]);
    const type = process.argv[3].toLowerCase() === "nip" ? "nip" : "regon";
    const value = process.argv[4];

    const client = bir(production);

    console.log("SID: ", await client.login(process.env.GUS_API_KEY));
    let entity;
    if(type === 'nip'){
        entity = await client.search_nip(value);
    }else{
        entity = await client.search_regon(value);
    }
    console.log("Search: ", entity);
    if(entity){
        const report = await client.report(entity.regon14, entity.full_report);
        console.log("Report: ", report);
    }
};

main().catch(err => {
    console.log("Something failed.", err);
});