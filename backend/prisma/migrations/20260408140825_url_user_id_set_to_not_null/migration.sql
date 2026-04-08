/*
  Warnings:

  - Made the column `user_id` on table `urls` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "urls" DROP CONSTRAINT "urls_user_id_fkey";

-- AlterTable
ALTER TABLE "urls" ALTER COLUMN "user_id" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "urls" ADD CONSTRAINT "urls_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
