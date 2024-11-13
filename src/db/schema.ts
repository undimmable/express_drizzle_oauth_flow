import {pgEnum, pgTable, timestamp, unique, uuid, varchar} from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum('auth_role', [
    'company_user',
    'company_admin',
    'client_user'
]);

export const companiesTable = pgTable('companies', {
    id: uuid('id').primaryKey().defaultRandom().notNull(),
    business_id: varchar('business_id', {length: 255}).notNull().unique(),
    password_hash: varchar('password_hash', {length: 255}).notNull(),
    role: userRoleEnum('role').notNull(),
    last_updated: timestamp('last_updated').defaultNow().notNull().$onUpdate(() => new Date())
});

export const clientsTable = pgTable('clients', {
    id: uuid('id').primaryKey().defaultRandom().notNull(),
    username: varchar('username', {length: 255}).notNull().unique(),
    password_hash: varchar('password_hash', {length: 255}).notNull(),
    // theoretically, b2b2c users might have multiple b2b companies
    role: userRoleEnum('role').notNull(),
    last_updated: timestamp('last_updated').defaultNow().notNull().$onUpdate(() => new Date())
});

export const companyClientsTable = pgTable('company_clients', {
    id: uuid('id').primaryKey().defaultRandom().notNull(),
    company_business_id: varchar('company_business_id', {length: 255}).notNull().unique(),
    client_id: uuid('client_id').notNull().references(() => clientsTable.id, {onDelete: "cascade"}),
    last_updated: timestamp('last_updated').defaultNow().notNull().$onUpdate(() => new Date())
    // theoretically, b2b2c users might have multiple b2b companies, but no such use-case for now, thus constraint
}, (t) => ({unq: unique().on(t.company_business_id, t.client_id)}))

export const productsTable = pgTable('products', {
    id: uuid('id').primaryKey().defaultRandom().notNull(),
    product_name: varchar('name', {length: 255}).notNull(),
    company_id: uuid('company_id').references(() => companiesTable.id, {onDelete: "cascade"}).notNull(),
    last_updated: timestamp('last_updated').defaultNow().notNull().$onUpdate(() => new Date())
}, (t) => ({unq: unique().on(t.product_name, t.company_id)}));

export const subscriptionsTable = pgTable('subscriptions', {
    id: uuid('id').primaryKey().defaultRandom().notNull(),
    product_id: uuid('product_id').references(() => productsTable.id, {onDelete: "cascade"}).notNull(),
    client_id: uuid('client_id').references(() => clientsTable.id, {onDelete: "cascade"}).notNull(),
    last_updated: timestamp('last_updated').defaultNow().notNull().$onUpdate(() => new Date())
}, (t) => ({unq: unique().on(t.product_id, t.client_id)}));

export const userAuthTable = pgTable('user_auth', {
        id: uuid('id').primaryKey().defaultRandom().notNull(),
        user_id: uuid('user_id').notNull(),
        refresh_token: varchar('refresh_token').notNull(),
        user_type: varchar('user_type', {length: 255}).notNull(),
        last_updated: timestamp('last_updated').defaultNow().notNull().$onUpdate(() => new Date())
    }, (t) => ({unq: unique().on(t.user_id, t.user_type)})
);


// noinspection JSUnusedGlobalSymbols
export const schema = {
    schema: {
        auths: userAuthTable,
        companies: companiesTable,
        clients: clientsTable,
        companyClients: companyClientsTable,
        products: productsTable,
        subscriptions: subscriptionsTable
    }
};
