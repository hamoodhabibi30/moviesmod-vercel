const MoviesMoDBypasser = require('../lib/bypasser');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        service: 'MoviesMod Bypasser API on Vercel'
    });
};
