import { Router, Request, Response } from "express";
import { requireAuth } from "../middlewares/requireAuth";

export const userRoute = Router();

userRoute.get('/me', requireAuth,(req: Request, res: Response) => {
    const authReq = req as any;
    const user = authReq.user;

    return res.json({user});
});