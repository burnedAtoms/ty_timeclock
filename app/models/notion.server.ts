import { NotionUser, User } from '@prisma/client'
import { LoaderFunctionArgs } from '@remix-run/node'
import React from 'react'
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
            allowNotionAccess: true
        }
    });
}

export async function findNotionUser(userId: User["id"]){return prisma.notionUser.findUnique({
    where: {userId}
})};

export async function disconnectNotionUser(userId: User["id"]){
    return prisma.notionUser.update({
        where: {userId},
        data: {
            allowAccess: false
        }
    });
}