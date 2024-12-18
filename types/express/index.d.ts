// noinspection ES6UnusedImports
import express from "express";
import {Client, Company, RefreshTokenPayload, UserPayload} from "../../middleware/auth";

declare global {
    namespace Express {
        export interface Request {
            user?: Client | Company;
            token?: UserPayload;
            refreshToken?: RefreshTokenPayload;
        }
    }
}