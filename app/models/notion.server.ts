import { NotionUser, User } from '@prisma/client'

import { prisma } from '~/db.server'

export async function createNotionUser(userId: User["id"],
    accessToken: NotionUser["accessToken"],
    botId: NotionUser["botId"],
    ownerId: NotionUser["ownerId"],
    workspaceName: NotionUser["workspaceName"],
    workspaceId: NotionUser["workspaceId"]
    ){
    return await prisma.notionUser.create({
        data: {
            user: {
                connect: {
                    id: userId
                }
            },
            allowAccess: true,
            accessToken,
            botId,
            ownerId,
            workspaceName,
            workspaceId
        }
    })
}

export async function allowUserAccess(userID: User["id"]){
    return prisma.user.update({
        where: {id: userID},
        data: {
            allowNotionAccess: true,
        }
    });
}

export async function updateAccessToken(userID: NotionUser["userId"],accessToken: NotionUser["accessToken"]){
    return prisma.notionUser.update({
        where: {userId: userID},
        data: {
            accessToken,
        }
    });
}

export async function findNotionUser(userId: User["id"]){return prisma.notionUser.findUnique({
    where: {userId}
})};

export async function disconnectNotionUser(userId: NotionUser["userId"]){
    return prisma.user.update({
        where: {id: userId},
        data: {
            allowNotionAccess: false
        }
    });
}