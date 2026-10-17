import type { Prisma, PrismaClient } from '@/generated/prisma/client';

/** Anything that can run queries: the root client or a transaction client. */
export type DbClient = PrismaClient | Prisma.TransactionClient;
