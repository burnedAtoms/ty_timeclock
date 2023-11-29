/* eslint-disable @typescript-eslint/no-explicit-any */



import { ActionFunctionArgs, LoaderFunction, LoaderFunctionArgs, json } from "@remix-run/node";
import { Form, useActionData, useLoaderData } from "@remix-run/react";
import { useEffect, useState } from "react";

import Header from "~/components/Header";
import { NotionOauth, disconnectNotionUser, getNotionClient, getUserAllowAccess } from "~/models/notion.server";
import { getUserId } from "~/session.server";
import { useUser } from "~/utils";

export const loader: LoaderFunction = async ({ request }: LoaderFunctionArgs) => {
    const authUrl = process.env.AUTH_URL;
    let allowedAccess;
    const user = await getUserId(request);
    const url = new URL(request.url);
    const code = url.searchParams.get('code');
    if (code) {
        await NotionOauth(request, code!);
    }

    if (user) {
        allowedAccess = await getUserAllowAccess(user!);
    }

    if (allowedAccess?.allowNotionAccess === true) {
        try {
            const response = await getNotionClient(request);
            const data = await response.search({ filter: { property: "object", value: "database" } })
            //console.log(data?.results);
            return json({ data, allowedAccess });
        } catch (error) {
            console.error('Error fetching data from Notion:', error);
            return json({ error: 'Failed to fetch data from Notion' }, 500) as never;
        }
    }

    return json({ authUrl, allowedAccess });
};

export async function action({
    request,
}: ActionFunctionArgs) {
    const body = await request.json();
    const isDisconnect = body.isDisconnect;

    if (isDisconnect) {
        const userID = await getUserId(request);
        await disconnectNotionUser(userID!);
        return json({ success: true });
    }

    return json({ success: false, message: 'Invalid action' }, 400);
}

const Dashboard = () => {
    const data = useLoaderData<typeof loader>();
    const isDisconnected = useActionData<typeof action>();
    const [disconnectNotion, setDisconnectNotion] = useState<boolean>(false);
    const user = useUser();
    const [tasks, setTasks] = useState([]);
    const [intervalId, setIntervalId] = useState<NodeJS.Timeout>();
    const [selectedDatabaseId, setSelectedDatabaseId] = useState('');
    const [isRunning, setRunning] = useState<boolean>(false);


    useEffect(() => {
        console.log("disconnectNotion changed:", disconnectNotion);
        if (isDisconnected?.success !== disconnectNotion) {
            setDisconnectNotion(isDisconnected?.success);
        }
    }, [disconnectNotion, isDisconnected?.success, setDisconnectNotion]);


    const handleDatabaseChange = async (event: React.ChangeEvent<HTMLSelectElement>) => {
        const databaseId = event.target.value;
        console.log('Database changed');
        if (intervalId) {
            clearInterval(intervalId);
        }

        setSelectedDatabaseId(databaseId);
        if (databaseId) {
            try {
                const response = await fetch(`/api/notion/${databaseId}/tasks`, {
                    method: 'GET',
                    headers: {
                        Accept: 'application/json',
                    },
                });

                const tasksData = await response.json();


                setTasks(tasksData.tasks);
                console.log(tasks);
            } catch (error) {
                console.error('Error fetching tasks from Notion:', error);
            }
        } else {
            setTasks([]);
        }
    };

    useEffect(() => {
        if (tasks && selectedDatabaseId && data?.allowedAccess?.allowNotionAccess) {
            if (intervalId) {
                clearInterval(intervalId);
            }
            setIntervalId(setInterval(async () => {
                try {
                    const response = await fetch(`/api/notion/${selectedDatabaseId}/tasks`, {
                        method: 'GET',
                        headers: {
                            Accept: 'application/json',
                        },
                    });

                    const tasksData = await response.json();
                    setTasks(tasksData.tasks);
                    console.log(tasksData.tasks);
                } catch (error) {
                    console.error('Error fetching tasks from Notion:', error);
                }
            }, 5000));
        }
    }, [tasks, selectedDatabaseId, data?.allowedAccess?.allowNotionAccess]);

    function unmountInterval() {
        if (intervalId) {
            clearInterval(intervalId);
        }
    }


    useEffect(() => {
        return () => {
            unmountInterval();
        };
    });

    const filteredDatabases = data?.data?.results.filter((database: any) => {
        return (
            database.properties &&
            database.properties['Tiaoyueh Time Clock']
        );
    });



    return (
        <main className="flex-col min-h-screen min-w-screen">
            <Header email={user.email} />
            <section className="relative min-h-screen min-w-screen bg-gray-600">
                {(!user.allowNotionAccess || disconnectNotion) ? <a
                    href={data?.authUrl}
                    className="bg-green-400 py-3 px-4 rounded-lg border-none hover:bg-white hover:text-green-600"
                >
                    Quick Setup
                </a> : null}
                {(user.allowNotionAccess && !disconnectNotion) ? <div className="px-4">
                    <h1 className="text-white font-bold font-sans text-2xl py-8">Welcome {user.username}</h1>
                    <select id="databaseSelector" value={selectedDatabaseId} onChange={handleDatabaseChange}>
                        <option value="">-- Select a Database --</option>
                        {filteredDatabases?.map((database: any) => (
                            <option key={database.id} value={database.id}>
                                {database.title[0].plain_text}
                            </option>
                        ))}
                    </select>

                    {tasks && tasks.length > 0 ? <div>
                        <h2 className="text-white mt-6 text-xl font-semibold leading-tight tracking-wider">Tasks:</h2>
                        <ul>
                            {tasks.map((task: any) => (
                                <li className="text-slate-300 leading-normal tracking-tighter py-4" key={task.id}>
                                    <h3>{task.properties['Task name'].title[0].plain_text}</h3>
                                    <h3>{task.properties.Status.status.name}</h3>
                                    <h3>{task.properties['Tiaoyueh Time Clock'].rich_text[0].plain_text}</h3>
                                    <Form action={isRunning ? "/stopTimer" : "/startTimer"} method="post">
                                        <button>{isRunning ? 'Stop Timer' : 'Start Timer'}</button>
                                    </Form>

                                </li>
                            ))}
                        </ul>
                    </div> : null}
                    {/* You can render additional content based on the selected database and tasks */}
                </div> : null}
            </section>
        </main>
    );
};

export default Dashboard;