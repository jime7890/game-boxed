import express from "express";
import cors from "cors";
import axios from "axios";
import env from "dotenv";
import bodyParser from "body-parser";
import NodeCache from 'node-cache';
import compression from "compression";

const app = express();
const port = 3000;
const cache = new NodeCache({ stdTTL: 604800 });

app.use(compression());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(cors());
env.config();

app.get("/", (req, res) => {
    res.render("landing.ejs");
})

const getAccessToken = async () => {
    let accessToken = cache.get('igdbAccessToken');

    if (accessToken) {
        return accessToken;
    }
    try {
        const response = await axios.post("https://id.twitch.tv/oauth2/token", null, {
            params: {
                client_id: process.env.IGDB_CLIENT_ID,
                client_secret: process.env.IGDB_CLIENT_SECRET,
                grant_type: 'client_credentials'
            }
        });

        accessToken = response.data.access_token;
        cache.set('igdbAccessToken', accessToken);

        return accessToken;
    } catch (error) {
        console.error("Error fetching access token", error);
        throw new Error("Unable to fetch access token");
    }
};

app.get('/games', async (req, res) => {
    const { search, range, theme, genre, platform, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let query = '';
    let countQuery = '';

    if (search) {
        query = `search "${search}"; fields name, rating, cover.url, slug, first_release_date; limit ${limit}; offset ${offset};`;
        countQuery = `search "${search}"; count;`;
    } else {
        let conditions = [];

        if (range) {
            conditions.push(`rating >= ${range}`);
        }
        if (theme) {
            conditions.push(`themes = ${theme}`);
        }
        if (genre) {
            conditions.push(`genres = ${genre}`);
        }
        if (platform) {
            conditions.push(`platforms = ${platform}`);
        }

        let whereClause = conditions.length > 0 ? `where ${conditions.join(' & ')}` : 'where rating >= 93';

        query = `fields name, rating, cover.url, slug, first_release_date, themes, genres, platforms; ${whereClause}; sort rating asc; limit ${limit}; offset ${offset};`;
        countQuery = `${whereClause}; count;`;
    }

    try {
        const access_token = await getAccessToken();
        const [gamesResponse, countResponse] = await Promise.all([
            axios.post('https://api.igdb.com/v4/games', query, {
                headers: {
                    'Accept-Encoding': 'gzip',
                    'Client-ID': process.env.IGDB_CLIENT_ID,
                    'Authorization': `Bearer ${access_token}`,
                }
            }),
            axios.post('https://api.igdb.com/v4/games/count', countQuery, {
                headers: {
                    'Accept-Encoding': 'gzip',
                    'Client-ID': process.env.IGDB_CLIENT_ID,
                    'Authorization': `Bearer ${access_token}`,
                }
            })
        ]);

        const totalGames = countResponse.data.count;
        const totalPages = Math.ceil(totalGames / limit);

        res.render('games.ejs', {
            games: gamesResponse.data,
            currentPage: parseInt(page),
            totalPages,
            limit: parseInt(limit),
            search,
            range,
            theme,
            genre,
            platform
        });

    } catch (error) {
        console.error("There was an error fetching the games", error);
        res.status(500).render("error.ejs", { error: "Failed to fetch games" });
    }
});

app.get("/games/:slug/:game", async (req, res) => {
    try {
        const access_token = await getAccessToken();
        const igdbResponse = await axios.post('https://api.igdb.com/v4/games', `fields name, storyline, summary, cover.url, first_release_date, genres.*, platforms.*, involved_companies.company.*, age_ratings.rating, age_ratings.category, screenshots.*, videos.*, language_supports.language.name, game_modes.name, artworks.url; where id=${req.params.game};`, {
            headers: {
                'Accept-Encoding': 'gzip',
                'Client-ID': process.env.IGDB_CLIENT_ID,
                'Authorization': `Bearer ${access_token}`,
            }
        });

        console.log(access_token)

        res.render("details.ejs", {
            games: igdbResponse.data[0]
        })

    } catch (error) {
        console.error("There was an error executing this fetch request", error);
        res.redirect("games.ejs");
    }
})

app.get("/companies/:company", async (req, res) => {
    try {
        const access_token = await getAccessToken();
        const igdbResponse = await axios.post('https://api.igdb.com/v4/companies', `fields name, description, logo.url; where slug = "${req.params.company}";`, {
            headers: {
                'Accept-Encoding': 'gzip',
                'Client-ID': process.env.IGDB_CLIENT_ID,
                'Authorization': `Bearer ${access_token}`,
            }
        });

        res.render("companies.ejs", {
            company: igdbResponse.data[0]
        })

    } catch (error) {
        console.error("There was an error executing this fetch request", error);
        res.redirect("games.ejs");
    }
})

app.get("/*", (req, res) => {
    res.redirect("/");
})

app.listen(port, console.log(`Listening on port ${port}`))
