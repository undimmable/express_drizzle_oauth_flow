import {NextFunction, Request, Response} from "express";
import crypto from "crypto";
import {and, eq} from "drizzle-orm";
import jwt, {DecodeOptions, SignOptions, VerifyOptions} from "jsonwebtoken";
import {AuthRepository, ClientRepository, CompanyRepository, db} from "../db/repositories";
import {clientsTable, companiesTable, schema } from "../db/schema";

const ACCESS_TOKEN_TTL: string = '15m';
const REFRESH_TOKEN_TTL: string = '15d';
export const JWT_SECRET = process.env.JWT_SECRET!;

const JWT_OPTIONS: VerifyOptions | SignOptions | DecodeOptions = {
    algorithm: "HS256",
    issuer: 'drizzle'
}

const unauthenticated = (res: Response, reason: ErrorReasons = ErrorReasons.token_invalid) => res.status(401).json({reason: reason.toString()});

const unauthenticatedMissingToken =
    (res: Response) => unauthenticated(res, ErrorReasons.token_missing);

const unauthenticatedInvalidToken =
    (res: Response) => unauthenticated(res, ErrorReasons.token_invalid);

const unauthenticatedInvalidRefreshToken =
    (res: Response) => unauthenticated(res, ErrorReasons.refresh_token_invalid);

const unauthenticatedExpiredToken =
    (res: Response) => unauthenticated(res, ErrorReasons.token_expired);

const unauthenticatedInvalidLogin =
    (res: Response) => unauthenticated(res, ErrorReasons.login_invalid);

export const getUserByBusinessIdOrUsername = async (userType: UserType, entityId: string) => {
    return (userType === UserType.company ? CompanyRepository.getByBusinessId(entityId) : ClientRepository.getByUsername(entityId))
}

export const getUserById = async (userType: UserType, entityId: string) => {
    return (userType === UserType.company ? CompanyRepository.getById(entityId) : ClientRepository.getById(entityId))
}


export const isCompany = (userRole: UserRole): boolean => {
    return ["company_user", "company_admin"].includes(userRole.toString());
}

export const getUserType = (payload: {
    role: UserRole
}): UserType => {
    return isCompany(payload.role) ? UserType.company : UserType.client;
}

export const getBusinessIdOrUsername = (payload: UserPayload): string => {
    return isCompany(payload.role) ? payload.business_id! : payload.username!;
}

export const getId = (payload: { entity_id: string }): string => {
    return payload.entity_id;
}

export const authenticateWithAccessToken = (userRole: UserRole, ...userRoles: UserRole[]) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        userRoles.push(userRole);
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.includes('Bearer ')) {
            unauthenticated(res);
            return;
        }
        try {
            const token = parseAccessTokenJwt(authHeader.split('Bearer ')[1]);
            if (!token) {
                unauthenticatedMissingToken(res);
                return;
            }

            if (!userRoles.includes(token.role)) {
                unauthenticatedInvalidToken(res);
                return;
            }

            req.token = token;

            if (isCompany(token.role)) {
                await authenticateCompany(req, res, next);
            } else {
                await authenticateClient(req, res, next);
            }
        } catch (e) {
            if (e instanceof jwt.TokenExpiredError) {
                unauthenticatedExpiredToken(res);
                return;
            } else {
                throw e;
            }
        }
    };
};

export const authenticateWithUsernamePassword = async (req: Request, res: Response, next: NextFunction) => {
    const login: LoginRequest = req.body;

    const users = await db
        .select()
        .from(clientsTable)
        .where(
            and(
                eq(clientsTable.username, login.username),
                eq(clientsTable.password_hash, hashPassword(login.password))
            ));
    if (users.length === 0) {
        unauthenticatedInvalidLogin(res);
        return;
    }

    req.user = users[0];

    next();
}

export const authenticateWithRefreshToken = async (req: Request, res: Response, next: NextFunction) => {
    const refreshTokenString = req.headers['refresh_token'] as string;
    if (!refreshTokenString) {
        unauthenticatedInvalidRefreshToken(res);
        return;
    }
    try {
        const refreshToken = parseRefreshTokenJwt(refreshTokenString);

        const user = await getUserById(refreshToken.entity_type, refreshToken.entity_id);
        if (!user) {
            unauthenticatedInvalidRefreshToken(res);
            return;
        }
        const userAuth = await AuthRepository.getRefreshTokenAuth(user.id, hashPassword(refreshTokenString));
        if (!userAuth) {
            unauthenticatedInvalidRefreshToken(res);
            return;
        }

        req.refreshToken = refreshToken;
        req.user = user;

        next();
    } catch (e) {
        if (e instanceof jwt.TokenExpiredError) {
            unauthenticatedExpiredToken(res);
            return;
        } else {
            throw e;
        }
    }
}

const authenticateCompany = async (req: Request, res: Response, next: NextFunction) => {
    const companies = await db
        .select()
        .from(companiesTable)
        .where(
            eq(companiesTable.business_id, getBusinessIdOrUsername(req.token!))
        );

    if (companies.length === 0) {
        return res.status(401).json({reason: ErrorReasons.token_invalid});
    }
    req.user = companies[0];

    next();
}

const authenticateClient = async (req: Request, res: Response, next: NextFunction) => {
    const clients = await db
        .select()
        .from(clientsTable)
        .where(
            eq(clientsTable.username, getId(req.token! as unknown as { entity_id: string }))
        );
    if (clients.length === 0) {
        return res.status(401).json({reason: ErrorReasons.token_invalid});
    }
    req.user = clients[0];

    next();
}

export const createAccessToken = (payload: UserPayload): string => {
    return jwt.sign(payload, JWT_SECRET, {
        ...JWT_OPTIONS,
        expiresIn: ACCESS_TOKEN_TTL
    });
}

export const createRefreshToken = (payload: RefreshTokenPayload): string => {
    return jwt.sign(payload , JWT_SECRET, {
        ...JWT_OPTIONS,
        expiresIn: REFRESH_TOKEN_TTL
    });
}

export const parseAccessTokenJwt = (token: string): UserPayload => {
    return jwt.verify(token, JWT_SECRET, JWT_OPTIONS) as UserPayload;
}

export const parseRefreshTokenJwt = (token: string): RefreshTokenPayload => {
    return jwt.verify(token, JWT_SECRET, JWT_OPTIONS) as RefreshTokenPayload;
}

export const hashPassword = (password: string) => {
    return crypto.createHash("sha512").update(password, 'utf-8').digest('hex');
}


export type Client = typeof schema.schema.clients.$inferSelect
export type Company = typeof schema.schema.companies.$inferSelect
export type UserAuth = typeof schema.schema.auths.$inferSelect
export type Subscription = typeof schema.schema.subscriptions.$inferSelect
export type CompanyClient = typeof schema.schema.companies.$inferSelect
export type Product = typeof schema.schema.products.$inferSelect
export type UserRole = 'company_user' | 'company_admin' | 'client_user';

export interface UserPayload {
    username?: string;
    business_id?: string;
    role: UserRole;
}

export interface RefreshTokenPayload {
    entity_id: string;
    entity_type: UserType;
}

export enum UserType {
    company = "company",
    client = "client",
}

export interface LoginRequest {
    username: string;
    password: string;
}

export enum ErrorReasons {
    token_missing = "token_missing",
    token_expired = "token_expired",
    token_invalid = "token_invalid",
    refresh_token_invalid = "refresh_token_invalid",
    login_invalid = "login_invalid"
}