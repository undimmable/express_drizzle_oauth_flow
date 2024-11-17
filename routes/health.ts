import express from "express";
import {db} from "../db/repositories";

const healthRouter = express.Router();

healthRouter.get('/', async (req, res) => {
    await db.execute("SELECT now()");
    res.status(200).send('OK');
});

export default healthRouter;