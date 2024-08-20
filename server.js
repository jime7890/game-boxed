import express from "express";
import cors from "cors";
import axios from "axios";
import env from "dotenv";
import bodyParser from "body-parser";
import NodeCache from 'node-cache';
import compression from "compression";

const app = express();
const port = 3000;
const cache = new NodeCache({ stdTTL: 3600 });

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

    // If there's already an access token in the cache, use that and end the function
    if (accessToken) {
        return accessToken;
    }

    // Requests an access token
    try {
        const response = await axios.post("https://id.twitch.tv/oauth2/token", null, {
            params: {
                client_id: process.env.IGDB_CLIENT_ID,
                client_secret: process.env.IGDB_CLIENT_SECRET,
                grant_type: 'client_credentials'
            }
        });

        accessToken = response.data.access_token;

        // Access token is saved in the cache
        cache.set('igdbAccessToken', accessToken);

        // Returns the a new token back to the calling function
        return accessToken;
    } catch (error) {
        console.error("Error fetching access token", error);
        throw new Error("Unable to fetch access token");
    }
};

app.get('/games', async (req, res) => {
    const searchQuery = req.query.search;
    const { range, theme, genre } = req.query;

    let query = '';

    if (searchQuery) {
        query = `search "${searchQuery}"; fields name, rating, cover.url, slug, first_release_date;`;
    } else if(range || theme || genre) {
        let conditions = [];

        if(range) {
            conditions.push(`rating = ${range}`)
        } 

        if(theme) {
            conditions.push(`themes = ${theme}`)
        }

        if(genre) {
            conditions.push(`genres = ${genre}`)
        }

        let baseQuery = "fields name, rating, cover.url, slug, first_release_date, themes, genres;"
        let whereCondition = conditions.length > 0 ? `where ${conditions.join(' & ')};` : '';
        let limit = "limit 20;"

        query = `${baseQuery} ${whereCondition} ${limit}`
    } else {
        query = `fields name, rating, cover.url, slug, first_release_date; where rating >= 85; limit 20;`;
    }

    try {
        const access_token = await getAccessToken();
        const igdbResponse = await axios.post('https://api.igdb.com/v4/games', query, {
            headers: {
                'Accept-Encoding': 'gzip',
                'Client-ID': process.env.IGDB_CLIENT_ID,
                'Authorization': `Bearer ${access_token}`,
            }
        });

        res.render('games.ejs', {
            range: range,
            theme: theme,
            genre: genre,
            games: igdbResponse.data,
        });

    } catch (error) {
        console.error("There was an error fetching the access token", error);
        res.redirect("landing.ejs");
    }
});

app.get("/games/:slug/:game", async (req, res) => {
    try {
        const access_token = await getAccessToken();
        const igdbResponse = await axios.post('https://api.igdb.com/v4/games', `fields name, storyline, summary, cover.url, first_release_date, genres.*, platforms.*, involved_companies.company.*, age_ratings.rating, age_ratings.category, screenshots.*, videos.*, language_supports.language.name, game_modes.name; where id=${req.params.game};`, {
            headers: {
                'Accept-Encoding': 'gzip',
                'Client-ID': process.env.IGDB_CLIENT_ID,
                'Authorization': `Bearer ${access_token}`,
            }
        });

        res.render("details.ejs", {
            games: igdbResponse.data[0]
        })

    } catch (error) {
        console.error("There was an error executing this fetch request", error);
        res.redirect("games.ejs");
    }

})

app.listen(port, console.log(`Listening on port ${port}`))
