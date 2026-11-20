import { NextFunction, Request, Response } from "express";

export const requireRole = (role: 'user' | 'admin') => (req: Request, res: Response, next: NextFunction) => {
    const authReq = req as any;
    const user = authReq.user;

    if(user.role !== role){
        return res.status(403).json({msg: 'Forbidden'})
    };
    next();
}