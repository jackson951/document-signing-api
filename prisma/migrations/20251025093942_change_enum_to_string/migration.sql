-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_SignatureField" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pageNumber" INTEGER NOT NULL,
    "x" REAL NOT NULL,
    "y" REAL NOT NULL,
    "width" REAL NOT NULL,
    "height" REAL NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'SIGNATURE',
    "signerId" TEXT NOT NULL,
    CONSTRAINT "SignatureField_signerId_fkey" FOREIGN KEY ("signerId") REFERENCES "Signer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_SignatureField" ("height", "id", "pageNumber", "signerId", "type", "width", "x", "y") SELECT "height", "id", "pageNumber", "signerId", "type", "width", "x", "y" FROM "SignatureField";
DROP TABLE "SignatureField";
ALTER TABLE "new_SignatureField" RENAME TO "SignatureField";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
