const { app } = require('@azure/functions');
const sql = require('mssql');
const config = require('../database/config.js');

async function searchFilms(title) {
    let filmsQuery = 'SELECT * FROM Films';
    let reviewsQuery = 'SELECT Films.title, Reviews.rating, Reviews.review_text FROM Films LEFT JOIN Reviews ON Films.id = Reviews.film_id WHERE';

    if (title) {
        filmsQuery += ` WHERE title LIKE '${title}'`;
        reviewsQuery += ` Films.title = '${title}' AND`;
    }
    reviewsQuery += ' (Reviews.review_text IS NOT NULL OR Reviews.rating IS NOT NULL)';

    await sql.connect(config);

    const films = await sql.query(filmsQuery);
    const reviews = await sql.query(reviewsQuery);

    await sql.close();

    return { films: films.recordset, reviews: reviews.recordset };
}

app.http('searchFilmByName', {
    methods: ['GET'],
    route: 'SearchFilmByName/{title?}',
    authLevel: 'anonymous',
    handler: async (request, context) => {
        context.log(`Processing search request...`);

        try {
            const title = request.params.title;
            const result = await searchFilms(title);
            return { status: 200, body: JSON.stringify(result) };
        } catch (error) {
            console.error('Error processing search request:', error);
            return { status: 500, body: `Error processing search request: ${error.message}` };
        }
    }
});
