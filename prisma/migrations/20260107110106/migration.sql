-- CreateTable
CREATE TABLE "City" (
    "id" SERIAL NOT NULL,
    "nameUa" TEXT NOT NULL,
    "nameRu" TEXT,
    "nameEn" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "countryUa" TEXT NOT NULL,
    "countryEn" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "City_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "City_nameUa_idx" ON "City"("nameUa");

-- CreateIndex
CREATE INDEX "City_nameEn_idx" ON "City"("nameEn");

-- CreateIndex
CREATE INDEX "City_latitude_longitude_idx" ON "City"("latitude", "longitude");
