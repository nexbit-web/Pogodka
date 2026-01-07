/*
  Warnings:

  - A unique constraint covering the columns `[nameEn]` on the table `City` will be added. If there are existing duplicate values, this will fail.
  - Made the column `nameRu` on table `City` required. This step will fail if there are existing NULL values in that column.

*/
-- DropIndex
DROP INDEX "City_latitude_longitude_idx";

-- DropIndex
DROP INDEX "City_nameEn_idx";

-- AlterTable
ALTER TABLE "City" ALTER COLUMN "nameRu" SET NOT NULL;

-- CreateIndex
CREATE INDEX "City_nameRu_idx" ON "City"("nameRu");

-- CreateIndex
CREATE INDEX "City_region_idx" ON "City"("region");

-- CreateIndex
CREATE UNIQUE INDEX "City_nameEn_key" ON "City"("nameEn");
