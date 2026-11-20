import express from "express";
import cookieParser from "cookie-parser";
import type { Request, Response } from 'express';
import { authRoute } from "./routes/auth-routes";
import { userRoute } from "./routes/user-routes";

const app = express();

app.use(express.json());
app.use(cookieParser());

app.use('/health', (_req: Request, res: Response) => {
    res.status(200).json({ health: 'OK' })
});

app.use('/auth', authRoute);
app.use('/user', userRoute);

export default app;