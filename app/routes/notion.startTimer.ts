import { ActionFunctionArgs, json } from "@remix-run/node";
import invariant from "tiny-invariant";

import { setNotionTYTimeClock } from "~/models/notion.server";
import { requireUserId } from "~/session.server";

const taskTimers: Record<string, Record<string, NodeJS.Timeout>> = {};

export const action = async ({ request }: ActionFunctionArgs) => {
    try {
        invariant(request.body, "Task Data was not found.");
        if (request.method === "POST") {
            const userId = await requireUserId(request);
            const body = await request.json();
            const taskId = body.taskId;
            const initTime = body.initTime;
            const taskStatus = body.taskStatus;
            let updatedTime: number = initTime;

            if (taskTimers[userId] && taskTimers[userId][taskId] && taskStatus !== "In progress" ) {
                setNotionTYTimeClock(request, formatTime(updatedTime), taskId, false);
                clearTimer(userId, taskId);
                return json({ running: true })
            } else if(taskStatus === "In progress"){
                if (taskTimers[userId] && taskTimers[userId][taskId]) {
                    return json({ running: true })
                } else {
                    const taskInterval = setInterval(() => {
                        updatedTime++;
                        if (updatedTime % 60 === 0) {
                            const formattedTime = formatTime(updatedTime);
                            setNotionTYTimeClock(request, formattedTime, taskId, true);
                            console.log("Formatted Timer: ", formattedTime);
                        }
                        console.log("Update time: ", updatedTime);
                    }, 1000);

                    if (!taskTimers[userId]) {
                        taskTimers[userId] = {};
                    }
                    taskTimers[userId][taskId] = taskInterval;
                    return json({ running: true });
                }
            }
            return json({ running: false });
        }
    } catch (error) {
        console.error("Error in timer loader:", error);
        return json({ error: "An error occurred while processing the timer." });
    }

    return json({ message: "Timer request processed successfully." });
};

const clearTimer = (userId: string, taskId: string) => {
    if (taskTimers[userId] && taskTimers[userId][taskId]) {
        clearInterval(taskTimers[userId][taskId]);
        delete taskTimers[userId][taskId];
    }
};

const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
};
