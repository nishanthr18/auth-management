import { Router, Request, Response } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import { requireRole } from "../middlewares/requireRole";

export const adminRoute = Router();

adminRoute.get('/user', requireAuth, requireRole('admin'), (req: Request, res: Response) => {
    const authReq = req as any;
    const user = authReq.user;

    return res.json({user});
});