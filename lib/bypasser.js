const axios = require('axios');
const cheerio = require('cheerio');
const base64 = require('base-64');
const utf8 = require('utf8');

class MoviesMoDBypasser {
    constructor() {
        this.axiosInstance = axios.create({
            baseURL: 'https://moviesmod.cafe',
            timeout: 30000,
            headers: {
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Cache-Control': 'no-store',
                'DNT': '1',
                'sec-ch-ua': '"Not_A Brand";v="8", "Chromium";v="120", "Microsoft Edge";v="120"',
                'sec-ch-ua-mobile': '?0',
                'sec-ch-ua-platform': '"Windows"',
                'Sec-Fetch-Dest': 'document',
                'Sec-Fetch-Mode': 'navigate',
                'Cookie': 'popads_user_id=6ba8fe60a481387a3249f05aa058822d',
                'Sec-Fetch-Site': 'none',
                'Sec-Fetch-User': '?1',
                'Upgrade-Insecure-Requests': '1'
            },
            validateStatus: () => true
        });
    }

    async getMeta(link) {
        try {
            const response = await this.axiosInstance.get(link);
            if (response.status !== 200) throw new Error(`HTTP ${response.status}`);
            
            const $ = cheerio.load(response.data);
            const title = $('.imdbwp__title').text().trim() || '';
            const synopsis = $('.imdbwp__teaser').text().trim() || '';
            const image = $('.imdbwp__thumb img').attr('src') || '';
            
            let imdbId = '';
            const imdbLink = $('.imdbwp__link').attr('href');
            if (imdbLink) {
                const parts = imdbLink.split('/');
                if (parts.length > 4) imdbId = parts[4];
            }

            const contentText = $('.thecontent').text().toLowerCase();
            const contentType = contentText.includes('season') ? 'series' : 'movie';

            const links = [];
            $('h3, h4').each((i, element) => {
                const hTag = $(element);
                const seriesTitle = hTag.text().trim();
                const nextP = hTag.next('p');
                
                if (nextP.length) {
                    const episodesLinkElem = nextP.find('a.maxbutton-episode-links, a.maxbutton-g-drive, a.maxbutton-af-download');
                    const movieLinkElem = nextP.find('a.maxbutton-download-links');
                    
                    const episodesLink = episodesLinkElem.attr('href') || '';
                    const movieLink = movieLinkElem.attr('href') || '';

                    if (movieLink || (episodesLink && episodesLink !== 'javascript:void(0);')) {
                        const qualityMatch = seriesTitle.match(/\d+p\b/);
                        const quality = qualityMatch ? qualityMatch[0] : "";
                        
                        links.push({
                            title: seriesTitle.replace('Download ', '').trim() || 'Download',
                            episodes_link: episodesLink,
                            direct_links: movieLink ? [{ link: movieLink, title: 'Movie', type: 'movie' }] : [],
                            quality: quality
                        });
                    }
                }
            });

            return { success: true, title, synopsis, image, imdb_id: imdbId, type: contentType, link_list: links };
            
        } catch (error) {
            return { success: false, error: error.message, title: '', synopsis: '', image: '', imdb_id: '', type: 'movie', link_list: [] };
        }
    }

    async getEpisodes(url) {
        try {
            let targetUrl = url;
            if (url.includes("url=")) {
                const encodedUrl = url.split("url=")[1];
                targetUrl = base64.decode(encodedUrl);
            }

            const response = await this.axiosInstance.get(targetUrl);
            const $ = cheerio.load(response.data);

            const metaRefresh = $('meta[http-equiv="refresh"]').attr('content');
            if (metaRefresh && metaRefresh.includes('url=')) {
                const newUrl = metaRefresh.split('url=')[1];
                const redirectResponse = await this.axiosInstance.get(newUrl);
                $.root().append(redirectResponse.data);
            }

            const episodeLinks = [];

            $('h3, h4').each((i, element) => {
                const hTag = $(element);
                const title = hTag.text().trim();
                const link = hTag.find('a').attr('href');
                if (link && link !== '#') episodeLinks.push({ title, link });
            });

            $('a.maxbutton').each((i, element) => {
                const button = $(element);
                const title = button.find('span').text().trim();
                const link = button.attr('href');
                if (link && link !== '#') episodeLinks.push({ title, link });
            });

            return episodeLinks;

        } catch (error) {
            return [];
        }
    }

    async modExtractor(url) {
        try {
            if (!url.includes("sid=")) throw new Error("No sid parameter found");
            const wp_http = url.split("sid=")[1];
            const baseUrl = url.split("?")[0];

            const formData = new URLSearchParams({ '_wp_http': wp_http });
            const response = await this.axiosInstance.post(baseUrl, formData.toString(), {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
            });

            const $ = cheerio.load(response.data);
            const wp_http2_input = $('input[name="_wp_http2"]');
            if (!wp_http2_input.length) throw new Error("Could not find _wp_http2 input");
            
            const wp_http2 = wp_http2_input.attr('value') || '';
            const form = $('form');
            const formAction = form.attr('action') || baseUrl;
            
            const formData2 = new URLSearchParams({ '_wp_http2': wp_http2 });
            const response2 = await this.axiosInstance.post(formAction, formData2.toString(), {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
            });

            const linkMatch = response2.data.match(/setAttribute\("href",\s*"(.*?)"/);
            if (!linkMatch) throw new Error("Could not find final link");

            return { success: true, final_link: linkMatch[1] };

        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async extractStreams(link, contentType = "movie") {
        try {
            let targetUrl = link;

            if (contentType === "series") {
                if (link.includes("modrefer.in") && link.includes("url=")) {
                    const encodedUrl = link.split("url=")[1];
                    const decodedUrl = base64.decode(encodedUrl);
                    targetUrl = decodedUrl;
                }

                if (targetUrl.includes("episodes.modpro.blog")) {
                    const episodes = await this.getEpisodes(targetUrl);
                    const allServers = [];
                    for (const episode of episodes) {
                        if (episode.link.includes("sid=")) {
                            const episodeServers = await this.extractStreams(episode.link, 'movie');
                            for (const server of episodeServers) server.episode = episode.title;
                            allServers.push(...episodeServers);
                        }
                    }
                    return allServers;
                }
            }

            if (contentType === "movie") {
                const episodes = await this.getEpisodes(link);
                if (episodes.length > 0) targetUrl = episodes[0].link;
            }

            const extractorResult = await this.modExtractor(targetUrl);
            if (!extractorResult.success) throw new Error(extractorResult.error);

            const redirectMatch = extractorResult.final_link.match(/content="0;url=(.*?)"/);
            const ddl = redirectMatch ? redirectMatch[1] : extractorResult.final_link;

            return [{
                server: 'Google Drive',
                link: ddl,
                type: 'mkv',
                quality: '1080p'
            }];

        } catch (error) {
            return [];
        }
    }

    async extractMovie(url) {
        try {
            const meta = await this.getMeta(url);
            if (!meta.success) throw new Error(meta.error);

            const streams = [];
            for (const linkInfo of meta.link_list) {
                let linkStreams = [];
                
                if (linkInfo.direct_links.length > 0) {
                    linkStreams = await this.extractStreams(linkInfo.direct_links[0].link, 'movie');
                } else if (linkInfo.episodes_link) {
                    linkStreams = await this.extractStreams(linkInfo.episodes_link, 'series');
                }

                for (const stream of linkStreams) {
                    stream.quality = linkInfo.quality;
                    stream.title = linkInfo.title;
                }
                streams.push(...linkStreams);
            }

            return { ...meta, streams, success: true };

        } catch (error) {
            return {
                success: false,
                error: error.message,
                title: '', synopsis: '', image: '', imdb_id: '', type: 'movie',
                link_list: [], streams: []
            };
        }
    }
}

module.exports = MoviesMoDBypasser;