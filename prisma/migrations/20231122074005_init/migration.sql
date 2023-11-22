-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "firstname" TEXT NOT NULL,
    "surname" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "allowNotionAccess" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Password" (
    "hash" TEXT NOT NULL,
    "userId" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Task" (
    "id" SERIAL NOT NULL,
    "taskname" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Not started',
    "project" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "totalTime" TEXT,
    "assigneeId" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "TimeLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userName" TEXT NOT NULL,
    "logEntry" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "taskId" TEXT NOT NULL,
    "taskName" TEXT NOT NULL,
    "taskStartedAt" TIMESTAMP(3) NOT NULL,
    "taskEndedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TimeLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotionUser" (
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "allowAccess" BOOLEAN NOT NULL,
    "botId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "workspaceName" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_email_key" ON "User"("username", "email");

-- CreateIndex
CREATE UNIQUE INDEX "User_id_allowNotionAccess_key" ON "User"("id", "allowNotionAccess");

-- CreateIndex
CREATE UNIQUE INDEX "Password_userId_key" ON "Password"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Task_id_key" ON "Task"("id");

-- CreateIndex
CREATE UNIQUE INDEX "Task_id_taskname_key" ON "Task"("id", "taskname");

-- CreateIndex
CREATE UNIQUE INDEX "TimeLog_userId_key" ON "TimeLog"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "TimeLog_taskId_key" ON "TimeLog"("taskId");

-- CreateIndex
CREATE UNIQUE INDEX "NotionUser_userId_key" ON "NotionUser"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "NotionUser_accessToken_key" ON "NotionUser"("accessToken");

-- CreateIndex
CREATE UNIQUE INDEX "NotionUser_botId_key" ON "NotionUser"("botId");

-- CreateIndex
CREATE UNIQUE INDEX "NotionUser_ownerId_key" ON "NotionUser"("ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "NotionUser_botId_ownerId_key" ON "NotionUser"("botId", "ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "NotionUser_userId_allowAccess_key" ON "NotionUser"("userId", "allowAccess");

-- AddForeignKey
ALTER TABLE "Password" ADD CONSTRAINT "Password_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotionUser" ADD CONSTRAINT "NotionUser_userId_allowAccess_fkey" FOREIGN KEY ("userId", "allowAccess") REFERENCES "User"("id", "allowNotionAccess") ON DELETE RESTRICT ON UPDATE CASCADE;
