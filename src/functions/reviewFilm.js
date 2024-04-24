const { app } = require('@azure/functions');
const sql = require('mssql');
const config = require('../database/config.js');

async function streamToString(readableStream) {
    const chunks = [];
    for await (const chunk of readableStream) {
        chunks.push(chunk);
    }
    return Buffer.concat(chunks).toString('utf-8');
}

async function insertReviewRecord(reviewData) {
    const { film_id, review_text, rating, author } = reviewData;
    const review_date = new Date().toISOString();

    await sql.connect(config);

    try {
        const sqlRequest = new sql.Request();
        sqlRequest.input('film_id', sql.Int, film_id);
        sqlRequest.input('review_text', sql.Text, review_text);
        sqlRequest.input('rating', sql.Int, rating);
        sqlRequest.input('review_date', sql.DateTime, review_date);
        sqlRequest.input('author', sql.VarChar(255), author);
        await sqlRequest.query('INSERT INTO Reviews (film_id, review_text, rating, review_date, author) VALUES (@film_id, @review_text, @rating, @review_date, @author)');
        
        await sql.close();
        return { status: 201, body: "Review record created successfully." };
    } catch (error) {
        console.error('Error creating review record:', error);
        throw new Error(`Error creating review record: ${error.message}`);
    }
}

app.http('makeAReview', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        context.log(`Processing request to create a new review...`);

        try {
            const requestBody = await streamToString(request.body);
            const reviewData = JSON.parse(requestBody);

            if (!reviewData) {
                return { status: 400, body: "Request body is required." };
            }

            const { film_id, review_text, rating, author } = reviewData;
            if (!film_id || !review_text || !rating || !author) {
                return { status: 400, body: "Please provide all required fields: film_id, review_text, rating, author." };
            }

            const result = await insertReviewRecord(reviewData);
            return result;
        } catch (error) {
            console.error('Error creating review record:', error);
            return { status: 500, body: `Error creating review record: ${error.message}` };
        }
    }
});
