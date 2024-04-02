import { Connection, Request } from "tedious";

export default async function (context, req) {
    const review = {
        filmTitle: req.body.filmTitle,
        opinion: req.body.opinion,
        rating: req.body.rating,
        date: new Date(),
        author: req.body.author
    };

    const connection = new Connection({
        /* Connection configuration */
    });

    connection.on("connect", err => {
        if (err) {
            context.res = {
                status: 500,
                body: "Error connecting to database"
            };
            context.done();
            return;
        }

        const request = new Request(
            `INSERT INTO Reviews (FilmTitle, Opinion, Rating, Date, Author) VALUES ('${review.filmTitle}', '${review.opinion}', ${review.rating}, '${review.date.toISOString()}', '${review.author}')`,
            err => {
                if (err) {
                    context.res = {
                        status: 500,
                        body: "Error inserting review into database"
                    };
                } else {
                    context.res = {
                        status: 201,
                        body: "Review created successfully"
                    };
                }
                context.done();
            }
        );

        connection.execSql(request);
    });
};
