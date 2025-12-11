-- DropIndex
DROP INDEX "permissions_date_idx";

-- DropIndex
DROP INDEX "permissions_userId_date_idx";

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "address" TEXT,
ADD COLUMN     "phone" TEXT;
