/* eslint-disable @typescript-eslint/no-explicit-any */
import { json } from "@remix-run/node";


export const startTimerForTask = async (taskId: string, initTime: number, taskStatus: string) => {
    try {
        const response = await fetch(`notion/startTimer`, {
            method: 'POST',
            headers: {
                Accept: 'application/json',
            },
            body: JSON.stringify({ taskId, initTime, taskStatus })
        });

        const running = await response.json();
        console.log(running);
        return json({ running })
    } catch (error) {
        console.error('Error fetching tasks from Notion:', error);
    }
};

export const handleStartTimer = async (tasks:any) => {
    if (tasks) {
        await Promise.all(tasks.map(async (task:any) => {
            const taskId = task.id;
            const taskStatus = task.properties.Status.status.name;
            //console.log("TaskId: ",taskId);
            const str: string = task.properties['Tiaoyueh Time Clock'].rich_text[0].plain_text;
            //console.log(str);
            const regex = /^(\d+)h (\d+)m$/;
            const match = str.match(regex);
            if (!match) {
                throw new Error("Invalid formatted time string");
            }

            const hours = parseInt(match[1], 10);
            const minutes = parseInt(match[2], 10);

            const time = hours * 3600 + minutes * 60;
            const initTime: number = time;

            const response = await startTimerForTask(taskId, initTime, taskStatus);
            return json({ running: response });
        }
        ));
    }
};
