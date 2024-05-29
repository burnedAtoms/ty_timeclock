/* eslint-disable @typescript-eslint/no-explicit-any */

import { getNotionClient, getOwnerId, getUserAllowAccess, setNotionTYTimeClock } from "~/models/notion.server";
import { getUserId, requireUserId } from "~/session.server";
import { regexConvertToNotionTime } from "~/strings/app_strings";

const taskTimers: Record<string, Record<string, NodeJS.Timeout>> = {};
const mostRecentTask: Record<string, any> = {};
const intervalMap = new Map<string, NodeJS.Timeout>();

const fetchTasksInBackground = async (request: Request,selectedDatabaseId: string) => {
    const notionClient = await getNotionClient(request);
    const assigneeId = await getOwnerId(await requireUserId(request));
    const userDatabaseKey = `${assigneeId?.ownerId}-${selectedDatabaseId}`;

    try {
        if (intervalMap.has(userDatabaseKey)) {
            clearInterval(intervalMap.get(userDatabaseKey)!);
        }
        
        if (assigneeId) {
            const userId = await getUserId(request);
            const newIntervalId = setInterval(async () => {
                const userAccess = await getUserAllowAccess(userId!);
                if(userAccess?.allowNotionAccess){
                    await notionClient.databases.query({
                        database_id: selectedDatabaseId,
                        filter: {
                            and: [
                                { property: 'Assignee', people: { contains: assigneeId?.ownerId } },
                            ],
                        },
                    }).then((response) => {
                        if(response && response.status !== 200){
                            console.log("Checking tasks...");
                        }
                        //console.log("StartTimer: ", response);
                        return response;
                    }).then((finalResponse) => {
                        processTasks(request, finalResponse.results);
                    }).catch((error) => {
                        console.log(error);
                    });
                } else{
                    if (intervalMap.has(userDatabaseKey)) {
                        clearInterval(intervalMap.get(userDatabaseKey)!);
                        intervalMap.delete(userDatabaseKey);
                    }
                }
            }, 5000);
            intervalMap.set(userDatabaseKey, newIntervalId);
            return;
        }
    } catch (error) {
        console.error('Error fetching Notion updates:', error);
    }
};

const stringFormatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
};

const numberFormatTime = (task:any): number => {
    const strTime: string = task.properties['Tiaoyueh Time Clock'].rich_text[0].plain_text!;
    
    const match = strTime.match(regexConvertToNotionTime);
    if (!match) {
        throw new Error("Invalid formatted time string");
    }

    const hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);

    const time = hours * 3600 + minutes * 60;
    
    return time;
}

const processTasks = async (request: Request, tasks: any) => {
    const userId = await requireUserId(request);

    tasks.forEach((task: any) => {
        if (task.properties.Status.status.name === 'In progress') {
            if (!mostRecentTask[userId] || task.last_edited_time >= mostRecentTask[userId].last_edited_time) {
                if(mostRecentTask[userId]){
                    stopTimer(request, numberFormatTime(task), userId, mostRecentTask[userId]);
                }
                mostRecentTask[userId] = task;
            } else {
                stopTimer(request, numberFormatTime(task), userId, mostRecentTask[userId]);
            }
        } else {
            stopTimer(request, numberFormatTime(task), userId, task);
        }
    });

    if (mostRecentTask[userId]) {
        startTimer(request, mostRecentTask[userId]);
    }
};

const startTimer = async (request: Request,task:any) => {
    const userId = await requireUserId(request);
    const taskId = task.id;
    
    const initTime: number = numberFormatTime(task);
    let updatedTime: number = initTime;

    if(!taskTimers[userId] || !taskTimers[userId][taskId]){
        setNotionTYTimeClock(request, stringFormatTime(updatedTime), taskId, true);
        const taskInterval = setInterval(() => {
            updatedTime++;
            if (updatedTime % 60 === 0) {
                const formattedTime = stringFormatTime(updatedTime);
                setNotionTYTimeClock(request, formattedTime, taskId, true);
                console.log("Formatted Timer: ", formattedTime);
            }
            console.log("Update time: ", updatedTime);
        }, 1000);
    
        if (!taskTimers[userId]) {
            taskTimers[userId] = {};
        }
        taskTimers[userId][taskId] = taskInterval;
        console.log(`Starting timer for task: ${task.properties['Task name'].title[0].plain_text}`);
    }
    
};

const stopTimer = (request:Request,updatedTime: number, userId: string, task: any) => {
    const taskId = task.id;

    if (taskTimers[userId] && taskTimers[userId][taskId]) {
        if (task.properties.Status.status.name === 'In progress') {
            return;
        }
        setNotionTYTimeClock(request, stringFormatTime(updatedTime), taskId, false);
        clearInterval(taskTimers[userId][taskId]);
        delete taskTimers[userId][taskId];
        console.log(`Stopping timer for task: ${task.properties['Task name'].title[0].plain_text}`);
    }
};


export { fetchTasksInBackground };
