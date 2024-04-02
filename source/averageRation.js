import { Connection, Request } from "tedious";

export default async function (context, myTimer) {
    if (myTimer.isPastDue) {
        context.log("Timer function is running late!");
    }

    const connection = new Connection({
        /* Connection configuration */
    });

    connection.on("connect", err => {
        if (err) {
            context.log.error("Error connecting to database");
            context.done();
            return;
        }

        const request = new Request(
            `UPDATE Films SET AverageRating = (SELECT AVG(Rating) FROM Reviews WHERE Reviews.FilmTitle = Films.Title)`,
            err => {
                if (err) {
                    context.log.error("Error calculating average ratings");
                } else {
                    context.log("Average ratings calculated successfully");
                }
                context.done();
            }
        );

        connection.execSql(request);
    });
};
