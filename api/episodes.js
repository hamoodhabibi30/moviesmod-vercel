const MoviesMoDBypasser = require('../lib/bypasser');

const bypasser = new MoviesMoDBypasser();

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { url } = req.body;
        
        if (!url) {
            return res.status(400).json({ error: 'URL required' });
        }

        const episodes = await bypasser.getEpisodes(url);
        res.json({ success: true, episodes });

    } catch (error) {
        console.error('Episodes error:', error.message);
        res.status(500).json({ 
            error: 'Failed to get episodes',
            message: error.message 
        });
    }
};