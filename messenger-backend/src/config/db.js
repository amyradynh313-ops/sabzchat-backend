const { PrismaClient } = require('@prisma/client');

// یک نمونه واحد از Prisma Client در کل اپ استفاده می‌شه
const prisma = new PrismaClient();

module.exports = prisma;
