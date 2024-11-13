import express, {Request, Response} from "express";
import {eq} from "drizzle-orm";

import {
    authenticateWithAccessToken,
    authenticateWithRefreshToken,
    authenticateWithUsernamePassword,
    createAccessToken,
    createRefreshToken,
    getBusinessIdOrUsername,
    getUserType,
    hashPassword
} from './src/auth';
import {AuthRepository, db, ProductsRepository, SubscriptionsRepository} from "./src/repositories";
import {productsTable, subscriptionsTable} from "./src/db/schema";

const app = express();
const port = 3000;

app.use(express.json());

app.post('/api/auth/login', authenticateWithUsernamePassword, async (req: Request, res: Response) => {
    const payload = {
        entity_id: getBusinessIdOrUsername(req.user!),
        role: req.user!.role
    }

    const accessToken = createAccessToken(payload);

    const refreshToken = createRefreshToken({
        entity_type: getUserType(payload),
        entity_id: req.user!.id,
    });

    await AuthRepository.insertOrUpdateRefreshToken(req.user!.id, getUserType(payload), hashPassword(refreshToken));

    res.status(200).json({access_token: accessToken, refresh_token: refreshToken});
});

app.post('/api/auth/token', authenticateWithRefreshToken, async (req: Request, res: Response) => {
    if (req.refreshToken && req.user) {
        const token = createAccessToken({...req.user, role: req.user!.role});
        res.status(200).json({access_token: token});
    } else {
        res.status(401).json({reason: "unauthorised"});
    }
});

app.use('/api/clients/*', authenticateWithAccessToken('client_user'));

app.post('/api/clients/subscriptions/:product_id', async (req: Request, res: Response) => {
    await db.transaction(async (tx) => {
        const products = await tx
            .select()
            .from(productsTable)
            .where(
                eq(productsTable.id, req.params.product_id)
            );
        if (products.length === 0) {
            res.status(404).json({
                reason: "product_not_found"
            });
        } else {
            await tx
                .insert(subscriptionsTable)
                .values({
                    product_id: req.params.product_id,
                    client_id: req.user!.id
                });
            res.json({
                status: "success"
            });
        }
    })
});

app.get('/api/clients/subscriptions', async (req: Request, res: Response) => {
    res.json(await SubscriptionsRepository.getByClientId(req.user!.id));
});


app.use('/api/companies/*', authenticateWithAccessToken('company_user', "company_admin"));

app.get('/api/companies/products', async (req: Request, res: Response) => {
    res.json(await ProductsRepository.getByBusinessId(req.user!.id));
});


app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});