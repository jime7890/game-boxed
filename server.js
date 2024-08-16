import express from "express";

const app = express();
const port = 3000;

app.use(express.static("public"));

app.get("/", (req, res) => {
    res.render("landing.ejs");
})

app.get("/games", (req, res) => {
    res.render("games.ejs");
})

app.listen(port, console.log(`Listening on port ${port}`))
