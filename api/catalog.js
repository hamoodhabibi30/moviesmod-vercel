const axios = require('axios');

const CINEMETA_BASE = 'https://v3-cinemeta.strem.io';

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        const { type, category } = req.query;
        const { search, genre, skip = 0, limit = 20 } = req.query;

        if (!type || !category) {
            return res.status(400).json({ error: 'Type and category parameters required' });
        }

        let url = `${CINEMETA_BASE}/catalog/${type}/${category}.json?`;
        if (search) url += `search=${encodeURIComponent(search)}&`;
        if (genre) url += `genre=${encodeURIComponent(genre)}&`;
        url += `skip=${skip}&limit=${limit}`;

        const response = await axios.get(url, { timeout: 10000 });
        res.json(response.data);

    } catch (error) {
        console.error('Catalog error:', error.message);
        res.status(500).json({ 
            error: 'Failed to fetch catalog',
            message: error.message 
        });
    }
};