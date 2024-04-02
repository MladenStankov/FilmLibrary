import { v4 as uuidv4 } from 'uuid';
import { Connection, Request } from "tedious";

export default async function (context, req) {
    const film = {
        id: uuidv4(),
        title: req.body.title,
        year: req.body.year,
        genre: req.body.genre,
        description: req.body.description,
        director: req.body.director,
        actors: req.body.actors
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
            `INSERT INTO Films (Id, Title, Year, Genre, Description, Director, Actors) 
             VALUES ('${film.id}', '${film.title}', '${film.year}', '${film.genre}', '${film.description}', '${film.director}', '${film.actors}')
             `,
            err => {
                if (err) {
                    context.res = {
                        status: 500,
                        body: "Error inserting film into database"
                    };
                } else {
                    context.res = {
                        status: 201,
                        body: "Film created successfully"
                    };
                }
                context.done();
            }
        );

        connection.execSql(request);
    });
};
