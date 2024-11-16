import express, {Request, Response} from "express";
import {ProductsRepository} from "../db/repositories";
import {authenticateWithAccessToken} from "../middleware/auth";

const companiesRouter = express.Router();
companiesRouter.use(authenticateWithAccessToken('company_user', "company_admin"));

companiesRouter.get('/products', async (req: Request, res: Response) => {
    res.json(await ProductsRepository.getByBusinessId(req.user!.id));
});

export default companiesRouter;