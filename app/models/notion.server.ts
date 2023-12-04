/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/consistent-type-definitions */
import { Client } from '@notionhq/client'
import { GetDatabaseResponse, QueryDatabaseResponse } from '@notionhq/client/build/src/api-endpoints';
import { NotionUser, User, Task } from '@prisma/client'
import { json } from '@remix-run/node';

import { prisma } from '~/db.server'
import { getSession, getUserId, requireUserId } from '~/session.server';

const notionClientCache: Record<string, { client: Client; accessToken: string }> = {};

export async function NotionOauth(request: Request, code: string) {
    const clientId = process.env.OAUTH_CLIENT_ID;
    const clientSecret = process.env.OAUTH_CLIENT_SECRET;
    const redirectUri = decodeURIComponent(process.env.OAUTH_REDIRECT_URI!);
    const bodyContent = new Map(Object.entries({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirectUri,
    }))

    const encoded = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    try {
        const response = await fetch('https://api.notion.com/v1/oauth/token', {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                Authorization: `Basic ${encoded}`,
            },
            body: JSON.stringify(Object.fromEntries(bodyContent)),
        });

        const data = await response.json();
        if (data) {
            const userId = await getUserId(request);
            const accessToken: NotionUser["accessToken"] = data?.access_token;
            const ownerId: NotionUser["ownerId"] = data?.owner?.user?.id;
            const botId: NotionUser["botId"] = data?.bot_id;
            const workspaceName: NotionUser["workspaceName"] = data?.workspace_name;
            const workspaceId: NotionUser["workspaceId"] = data?.workspace_id;
            if (!await findNotionUser(userId!)) {
                if (await createNotionUser(userId!, accessToken, botId, ownerId, workspaceName, workspaceId)) {
                    await allowUserAccess(userId!);
                }
            } else {
                if (await updateAccessToken(userId!, accessToken)) {
                    await allowUserAccess(userId!);
                }
            }


        }
        console.log('OAuth token exchange response:', data);

        return json({ result: 'OAuth token exchange completed' });
    } catch (error) {
        console.error('Error fetching OAuth token:', error);

        return json({ error: 'Failed to fetch OAuth token' }, 500);
    }
}

export async function getNotionClient(request: Request): Promise<Client> {
    const userId = await requireUserId(request);
    const accessToken = await getAccessToken(userId!);

    if (notionClientCache[userId!] && notionClientCache[userId!].accessToken !== accessToken?.accessToken) {
        delete notionClientCache[userId!];
    }

    if (!notionClientCache[userId!] || notionClientCache[userId!].accessToken !== accessToken?.accessToken) {
        notionClientCache[userId!] = {
            client: new Client({
                auth: accessToken?.accessToken,
            }),
            accessToken: accessToken?.accessToken || '',
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
) {
    return await prisma.notionUser.create({
        data: {
            user: {
                connect: {
                    id: userId,
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

export async function allowUserAccess(userID: User["id"]) {
    return prisma.user.update({
        where: { id: userID },
        data: {
            allowNotionAccess: true,
        }
    });
}

export async function updateAccessToken(userID: NotionUser["userId"], accessToken: NotionUser["accessToken"]) {
    return prisma.notionUser.update({
        where: { userId: userID },
        data: {
            accessToken,
        }
    });
}

export async function getAccessToken(userID: NotionUser["userId"]) {
    return prisma.notionUser.findUnique({
        where: { userId: userID },
        select: {
            accessToken: true,
        }
    });
}

export async function findNotionUser(userId: User["id"]) {
    return prisma.notionUser.findUnique({
        where: { userId }
    })
};

export async function getUserAllowAccess(id: User["id"]) {
    return prisma.user.findUnique({
        where: { id },
        select: {
            allowNotionAccess: true
        }
    })
};

export async function disconnectNotionUser(userId: NotionUser["userId"]) {
    return prisma.user.update({
        where: { id: userId },
        data: {
            allowNotionAccess: false
        }
    });
}

export async function setSelectedDatabase(request: Request, databaseId: string) {
    const session = await getSession(request);
    session.set('selectedDatabaseId', databaseId);
}



export async function getNotionTimes(databaseResponse: QueryDatabaseResponse): Promise<{ taskId: string; timeInSeconds: number }[]> {
    try {


        const tasks = databaseResponse.results;

        // Extract time for each task
        const tasksWithTime = await Promise.all(
            tasks.map(async (task) => {
                const taskId = task.id;
                const timeInSeconds = await getTaskTime(task);
                return { taskId, timeInSeconds };
            })
        );

        return tasksWithTime;
    } catch (error) {
        console.error('Error fetching times from Notion:', error);
        return [];
    }
}

export async function setNotionTYTimeClock(request: Request, formattedTime: string, taskId: string, isRunning: boolean) {
    const client: Client = await getNotionClient(request);

    try {
        const response = await client.pages.update({
            page_id: taskId,
            properties: {
                'Tiaoyueh Time Clock': {
                    "rich_text": [
                        {
                            "type": "text",
                            "text": {
                                "content": formattedTime,
                            },
                            "annotations": {
                                "bold": true,
                                "color": isRunning ? "red" : "gray"
                            },
                            "plain_text": formattedTime,
                        },
                    ]
                },
            }
        });
        if(response){
            console.log("Notion time updated successfully.");
        }
    } catch {
        console.error("Failed to updated time in notion", 500);
    }
    
}


export async function getTaskTime(data: GetDatabaseResponse): Promise<number> {
    try {
        const response = data;
        const properties = response.properties;

        const timeProperty: Record<string, any> = properties['Tiaoyueh Time Clock'];

        if (timeProperty && timeProperty.type === 'rich_text') {
            const timeText = timeProperty.rich_text[0]?.plain_text || '';
            const timeInSeconds = timeStringToSeconds(timeText);
            return timeInSeconds;
        }

        return 0;
    } catch (error) {
        console.error(`Error fetching time for tasks from Notion:`, error);
        return 0;
    }
}

export function timeStringToSeconds(formattedTime: string): number {
    const regex = /^(\d+)h (\d+)m$/;
    const match = formattedTime.match(regex);

    if (!match) {
        throw new Error("Invalid formatted time string");
    }

    const hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);

    return hours * 3600 + minutes * 60;
}

export async function getOwnerId(userId: NotionUser["userId"]) {
    return prisma.notionUser.findUnique({
        where: { userId },
        select: {
            ownerId: true
        }
    });
}

export async function createTask(taskId: Task["taskId"],
    taskname: Task["taskname"],
    status: Task["status"],
    assigneeId: Task["assigneeId"]) {
    return prisma.task.create({
        data: {
            assignee: {
                connect: {
                    ownerId: assigneeId
                }
            },
            taskId,
            taskname,
            status,
        }
    });
}

export async function notionUpdateTYTimeClock() {
    //
}