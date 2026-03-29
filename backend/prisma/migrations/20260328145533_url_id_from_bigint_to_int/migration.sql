/*
  Warnings:

  - The primary key for the `urls` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `urls` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Integer`.

*/
-- AlterTable
ALTER TABLE "urls" DROP CONSTRAINT "urls_pkey";
ALTER TABLE "urls" ALTER COLUMN "id" TYPE INTEGER USING "id"::INTEGER;
ALTER TABLE "urls" ALTER COLUMN "id" SET DEFAULT nextval('urls_id_seq');
ALTER TABLE "urls" ADD CONSTRAINT "urls_pkey" PRIMARY KEY ("id");
