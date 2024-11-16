import {
    authenticateWithRefreshToken,
    authenticateWithUsernamePassword,
    createAccessToken,
    createRefreshToken,
    getBusinessIdOrUsername,
    getUserType,
    hashPassword
} from "../middleware/auth";
import express, {Request, Response} from "express";
import {AuthRepository} from "../db/repositories";

const authRouter = express.Router();

authRouter.post('/login', authenticateWithUsernamePassword, async (req: Request, res: Response) => {
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

authRouter.post('/token', authenticateWithRefreshToken, async (req: Request, res: Response) => {
    if (req.refreshToken && req.user) {
        const token = createAccessToken({...req.user, role: req.user!.role});
        res.status(200).json({access_token: token});
    } else {
        res.status(401).json({reason: "unauthorised"});
    }
});

export default authRouter;