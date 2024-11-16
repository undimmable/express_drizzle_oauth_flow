import express, {Request, Response} from "express";
import {db, SubscriptionsRepository} from "../db/repositories";
import {productsTable, subscriptionsTable} from "../db/schema";
import {eq} from "drizzle-orm";
import {authenticateWithAccessToken} from "../middleware/auth";

const clientsRouter = express.Router();
clientsRouter.use(authenticateWithAccessToken('client_user'));

clientsRouter.post('/subscriptions/:product_id', async (req: Request, res: Response) => {
        try {
            await SubscriptionsRepository.createSubscription(req.params.product_id, req.user!.id);
        } catch (e) {
            if(e instanceof SubscriptionsRepository.NotFound) {
                res.status(404).json({
                    reason: "not_found"
                })
            }
        }
});

clientsRouter.get('/subscriptions', async (req: Request, res: Response) => {
    res.json(await SubscriptionsRepository.getByClientId(req.user!.id));
});

export default clientsRouter;