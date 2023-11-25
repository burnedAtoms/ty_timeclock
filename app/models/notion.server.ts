import { NotionUser, User } from '@prisma/client'
import { Client } from '@notionhq/client'

import { prisma } from '~/db.server'
import { getUser, getUserId, requireUserId } from '~/session.server';
import https from 'https'
import { al } from 'vitest/dist/reporters-5f784f42';

const notionClientCache: Record<string, { client: Client; accessToken: string }> = {};

export async function getNotionClient(request: Request): Promise<Client> {
    const userId = await requireUserId(request);
    const accessToken = await getAccessToken(userId!);
    console.log(accessToken?.accessToken);

    if (notionClientCache[userId!] && notionClientCache[userId!].accessToken !== accessToken?.accessToken) {
        delete notionClientCache[userId!];
    }

    if (!notionClientCache[userId!] || notionClientCache[userId!].accessToken !== accessToken?.accessToken) {
        notionClientCache[userId!] = {
            client: new Client({
                auth: accessToken?.accessToken,
            }),
            accessToken: accessToken?.accessToken || '', // Store the current access token
        };
    }

    return notionClientCache[userId!].client;
}

export async function clearNotionClient(request: Request) {
    const userId = await getUserId(request);
    delete notionClientCache[userId!];
}


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

export async function getAccessToken(userID: NotionUser["userId"]){
    return prisma.notionUser.findUnique({
        where: {userId: userID},
        select: {
            accessToken: true,
        }
    });
}

export async function findNotionUser(userId: User["id"]){return prisma.notionUser.findUnique({
    where: {userId}
})};

export async function getUserAllowAccess(id: User["id"]){return prisma.user.findUnique({
    where: {id},
    select: {
        allowNotionAccess: true
    }
})};

export async function disconnectNotionUser(userId: NotionUser["userId"]){
    return prisma.user.update({
        where: {id: userId},
        data: {
            allowNotionAccess: false
        }
    });
}

export async function fetchNotionUpdates(request: Request){
    const notionClient = getNotionClient(request);

}