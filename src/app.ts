import express from "express";
import cookieParser from "cookie-parser";
import type { Request, Response } from 'express';

const app = express();

app.use(express.json());
app.use(cookieParser());

app.use('/health', (_req: Request, res: Response) => {
    res.status(200).json({ health: 'OK' })
});

export default app;