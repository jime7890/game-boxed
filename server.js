import express from "express";
import cors from "cors";
import axios from "axios";
import env from "dotenv";
import bodyParser from "body-parser";

const app = express();
const port = 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(cors());
env.config();

app.get("/", (req, res) => {
    res.render("landing.ejs");
})

async function tokenRequest() {
    const response = await axios.post("https://id.twitch.tv/oauth2/token", null, {
        params: {
            client_id: process.env.IGDB_CLIENT_ID,
            client_secret: process.env.IGDB_CLIENT_SECRET,
            grant_type: 'client_credentials'
        }
    });

    return response;
}

app.get('/games', async (req, res) => {
    const searchQuery = req.query.search;

    let query = '';
    if (searchQuery) {
        query = `search "${searchQuery}"; fields name, rating, cover.url, slug, first_release_date, summary; limit 20;`;
    } else {
        query = `fields name, rating, cover.url, first_release_date, slug, summary; sort rating desc; where rating <= 100; limit 25;`;
    }

    try {
        const tokenResponse = await tokenRequest();
        const access_token = tokenResponse.data.access_token;

        try {
            const igdbResponse = await axios.post('https://api.igdb.com/v4/games', query, {
                headers: {
                    'Accept': 'application/json',
                    "Client-ID": process.env.IGDB_CLIENT_ID,
                    "Authorization": `Bearer ${access_token}`,
                }
            });

            res.render('games.ejs', {
                games: igdbResponse.data,
            });

        } catch (error) {
            console.error("Error fetching games from IGDB", error);
            res.redirect("landing.ejs");
        }

    } catch (error) {
        console.error("Error fetching access token", error);
        res.redirect("landing.ejs");
    }
});

// Feature: Slug Functionality
app.get("/games/:game", (req, res) => {
    console.log(req.params.game);
})



app.listen(port, console.log(`Listening on port ${port}`))
