import dotenv from "dotenv"

export default config = {
    user: process.env.USER,
    password: process.env.PASSWORD,
    database: process.env.DATABASE,
    server: process.env.SERVER,
    options: {
        encrypt: true
    }
}