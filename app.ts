import express from "express";

import authRouter from "./routes/auth";
import clientsRouter from "./routes/clients";
import companiesRouter from "./routes/companies";
import errorHandler from "./middleware/errorHandler";
import healthRouter from "./routes/health";

const app = express();
const port = 3000;

app.use(express.json());
app.use(errorHandler);

app.use('/api/health', healthRouter);
app.use('/api/auth', authRouter);
app.use('/api/clients', clientsRouter);
app.use('/api/companies', companiesRouter)

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});