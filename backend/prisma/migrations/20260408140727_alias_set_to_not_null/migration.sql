/*
  Warnings:

  - Made the column `alias` on table `urls` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "urls" ALTER COLUMN "alias" SET NOT NULL;
