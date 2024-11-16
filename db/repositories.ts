import {drizzle} from "drizzle-orm/node-postgres";
import {and, eq} from "drizzle-orm";
import {Pool} from "pg";
import {clientsTable, companiesTable, productsTable, subscriptionsTable, userAuthTable} from "./schema";

const pool = new Pool({
    connectionString: process.env.DATABASE_URL!,
    password: process.env.DATABASE_PASSWORD!
});

export const db = drizzle({client: pool});

export namespace AuthRepository {
    export const getRefreshTokenAuth = async (userId: string, hashedToken: string) => {
        const queryResult = await db.select()
            .from(userAuthTable)
            .where(and(eq(userAuthTable.refresh_token, hashedToken), eq(userAuthTable.user_id, userId)));
        if (queryResult.length === 0) {
            return null
        }
        return queryResult[0];
    }

    export const insertOrUpdateRefreshToken = async (userId: string, userType: "company" | "client", hashedToken: string) => {
        return await db.transaction(async (tx) => {
            const existingRow = await tx
                .select()
                .from(userAuthTable)
                .where(and(eq(userAuthTable.user_id, userId), eq(userAuthTable.user_type, userType.toString())));

            if (existingRow.length === 0) {
                await tx
                    .insert(userAuthTable)
                    .values([{
                        refresh_token: hashedToken, user_id: userId, user_type: userType.toString(),

                    }]);
            } else {
                await tx.update(userAuthTable).set({
                    refresh_token: hashedToken,
                }).where(and(eq(userAuthTable.user_id, userId), eq(userAuthTable.refresh_token, hashedToken), eq(userAuthTable.user_type, userType.toString()),));
            }
        });
    }
}


export namespace ClientRepository {
    export const getByUsername = async (username: string) => {
        const queryResult = await db
            .select()
            .from(clientsTable)
            .where(eq(clientsTable.username, username));

        if (queryResult.length === 0) {
            return null
        }
        return
    }

    export const getById = async (id: string) => {
        const queryResult = await db
            .select()
            .from(clientsTable)
            .where(eq(clientsTable.id, id));

        if (queryResult.length === 0) {
            return null
        }
        return queryResult[0];
    }
}

export namespace ProductsRepository {
    export const getByBusinessId = (businessId: string) => {
        return db
            .select()
            .from(productsTable)
            .where(eq(productsTable.company_id, businessId));
    }
}


export namespace SubscriptionsRepository {
    export const getByClientId = async (clientId: string) => {
        return db.select().from(subscriptionsTable).where(eq(subscriptionsTable.client_id, clientId));
    }

    export const createSubscription = async (productId: string, clientId: string) => {
        return await db.transaction(async (tx) => {
            const products = await tx
                .select()
                .from(productsTable)
                .where(
                    eq(productsTable.id, productId)
                );
            if (products.length === 0) {
                throw new NotFound();
            } else {
                await tx
                    .insert(subscriptionsTable)
                    .values({
                        product_id: productId,
                        client_id: clientId
                    });
            }
        });
    };

    export class NotFound extends Error {
    };
}

export namespace CompanyRepository {
    export const getByBusinessId = async (businessId: string) => {
        const queryResult = await db
            .select()
            .from(companiesTable)
            .where(eq(companiesTable.business_id, businessId));

        if (queryResult.length === 0) {
            return null
        }
        return queryResult[0];
    }

    export const getById = async (id: string) => {
        const queryResult = await db
            .select()
            .from(companiesTable)
            .where(eq(companiesTable.id, id));

        if (queryResult.length === 0) {
            return null
        }
        return queryResult[0];
    }
}