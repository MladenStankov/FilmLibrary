const { app } = require('@azure/functions');
const sql = require('mssql');
const config = require('../database/config.js');
const cheerio = require('cheerio');
const fetch = require('node-fetch');

const streamToString = async (readableStream) => {
    const chunks = [];
    for await (const chunk of readableStream) {
        chunks.push(chunk);
    }
    return Buffer.concat(chunks).toString('utf-8');
};

const searchImages = async (title) => {
    const searchQuery = `${title} film poster`;
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}&tbm=isch`;

    try {
        const response = await fetch(searchUrl);
        const html = await response.text();
        const $ = cheerio.load(html);
        const images = $('img').map((index, element) => $(element).attr('src')).get().filter(src => src && src.startsWith('http'));
        return images.slice(0, 6);
    } catch (error) {
        console.error('Error searching for images:', error);
        throw new Error('Failed to fetch images.');
    }
};

const searchSoundtrack = async (title) => {
    const searchQuery = `${title} soundtrack`;
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`;

    try {
        const response = await fetch(searchUrl);
        const html = await response.text();
        const $ = cheerio.load(html);
        const soundtrackUrl = $('a[href^="/url"]').first().attr('href').replace('/url?q=', '').split('&')[0];
        return soundtrackUrl;
    } catch (error) {
        console.error('Error searching for soundtrack:', error);
        throw new Error('Failed to fetch soundtrack.');
    }
};

const insertFilmRecord = async (filmData, soundtrack, thumbnailImages) => {
    const { title, year, genre, description, director, actors } = filmData;

    await sql.connect(config);

    const transaction = new sql.Transaction();
    await transaction.begin();

    try {
        const filmInsertQuery = `
            INSERT INTO Films (title, year, genre, description, director, actors, soundtrack) 
            VALUES (@title, @year, @genre, @description, @director, @actors, @soundtrack);
        `;

        const filmRequest = new sql.Request(transaction);
        filmRequest.input('title', sql.VarChar(100), title);
        filmRequest.input('year', sql.Int, year);
        filmRequest.input('genre', sql.VarChar(50), genre);
        filmRequest.input('description', sql.Text, description);
        filmRequest.input('director', sql.VarChar(50), director);
        filmRequest.input('actors', sql.Text, actors);
        filmRequest.input('soundtrack', sql.VarChar(255), soundtrack);
        await filmRequest.query(filmInsertQuery);

        const filmIdQuery = await sql.query`SELECT id FROM Films WHERE title = ${title}`;
        const filmId = filmIdQuery.recordset[0].id;

        const galleryInsertQuery = `
            INSERT INTO FilmGallery (film_id, thumbnail) 
            VALUES (@film_id, @thumbnail);
        `;

        const galleryRequest = new sql.Request(transaction);
        galleryRequest.input('film_id', sql.Int, filmId);
        galleryRequest.input('thumbnail', sql.VarChar(255), thumbnailImages[0]);
        await galleryRequest.query(galleryInsertQuery);

        const galleryIdQuery = await sql.query`SELECT id FROM FilmGallery WHERE film_id = ${filmId}`;
        const galleryId = galleryIdQuery.recordset[0].id;

        const pictureInsertQuery = `
            INSERT INTO GalleryPicture (gallery_id, picture) 
            VALUES (@gallery_id, @picture);
        `;

        for (let i = 0; i < thumbnailImages.length; i++) {
            const pictureRequest = new sql.Request(transaction);
            pictureRequest.input('gallery_id', sql.Int, galleryId);
            pictureRequest.input('picture', sql.VarChar(255), thumbnailImages[i]);
            await pictureRequest.query(pictureInsertQuery);
        }

        await transaction.commit();
        await sql.close();

        return { status: 201, body: "Film record created successfully." };
    } catch (error) {
        await transaction.rollback();
        console.error('Error inserting film record:', error);
        throw new Error(`Error inserting film record: ${error.message}`);
    }
};

app.http('createFilm', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        context.log(`Processing request to create a new film...`);

        try {
            const requestBody = await streamToString(request.body);
            const filmData = JSON.parse(requestBody);

            if (!filmData) {
                return { status: 400, body: "Request body is required." };
            }

            const { title } = filmData;
            if (!title) {
                return { status: 400, body: "Film title is required." };
            }

            const soundtrack = await searchSoundtrack(title);
            const thumbnailImages = await searchImages(title);

            const result = await insertFilmRecord(filmData, soundtrack, thumbnailImages);
            return result;
        } catch (error) {
            console.error('Error creating film record:', error);
            return { status: 500, body: `Error creating film record: ${error.message}` };
        }
    }
});
