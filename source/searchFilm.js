import { Connection, Request } from "tedious";

export default async function (context, req) {
    const searchQuery = req.query.search || '';

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
            `SELECT Films.*, AVG(Reviews.Rating) AS AverageRating, COUNT(Reviews.Rating) AS NumberOfReviews
            FROM Films
            LEFT JOIN Reviews ON Films.Title = Reviews.FilmTitle
            WHERE Films.Title LIKE '%${searchQuery}%'
            GROUP BY Films.Id, Films.Title, Films.Year, Films.Genre, Films.Description, Films.Director, Films.Actors, Films.AverageRating`,
            (err, rowCount, rows) => {
                if (err) {
                    context.res = {
                        status: 500,
                        body: "Error querying database"
                    };
                } else {
                    const films = [];
                    rows.forEach(row => {
                        films.push({
                            id: row[0].value,
                            title: row[1].value,
                            year: row[2].value,
                            genre: row[3].value,
                            description: row[4].value,
                            director: row[5].value,
                            actors: row[6].value,
                            averageRating: row[7].value,
                            numberOfReviews: row[8].value
                        });
                    });
                    context.res = {
                        status: 200,
                        body: films
                    };
                }
                context.done();
            }
        );

        connection.execSql(request);
    });
};
