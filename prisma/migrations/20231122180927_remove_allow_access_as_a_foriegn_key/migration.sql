-- DropForeignKey
ALTER TABLE "NotionUser" DROP CONSTRAINT "NotionUser_userId_allowAccess_fkey";

-- DropIndex
DROP INDEX "NotionUser_userId_allowAccess_key";

-- DropIndex
DROP INDEX "User_id_allowNotionAccess_key";

-- AddForeignKey
ALTER TABLE "NotionUser" ADD CONSTRAINT "NotionUser_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
