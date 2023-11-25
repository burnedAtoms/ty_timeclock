// ... (imports)

import { Client } from "@notionhq/client";
import { ActionFunctionArgs, LoaderFunction, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useActionData, useLoaderData } from "@remix-run/react";
import { useEffect, useState } from "react";

import Header from "~/components/Header";
import { disconnectNotionUser, getAccessToken, getNotionClient, getUserAllowAccess } from "~/models/notion.server";
import { getUserId } from "~/session.server";
import { useUser } from "~/utils";

export const loader: LoaderFunction = async ({ request }: LoaderFunctionArgs) => {
    const authUrl = process.env.AUTH_URL;
    let allowedAccess;
    const user = await getUserId(request);

    if (user) {
        allowedAccess = await getUserAllowAccess(user!);
    }

    if (allowedAccess?.allowNotionAccess === true) {
        try {
            const response = await getNotionClient(request);
            const data = await response.search({ filter: { property: "object", value: "database" } })
            console.log(data?.results);
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
    const disconnectUser = useActionData<typeof action>() as any;
    const [userDisconnected,setUserDisconnect] = useState(data.allowedAccess.allowNotionAccess);
    const user = useUser();
    const [tasks, setTasks] = useState([]);
    const [selectedDatabaseId, setSelectedDatabaseId] = useState('');

    useEffect(()=>{
        setUserDisconnect(disconnectUser?.success)
    },[userDisconnected]);


    useEffect(() => {
        const fetchData = async () => {
            const urlParams = new URLSearchParams(window.location.search);
            const codeFromUrl = urlParams.get('code');
            console.log(`Code From URL: ${codeFromUrl}`);

            if (codeFromUrl && !data?.allowedAccess?.allowNotionAccess) {
                try {
                    const response = await fetch(`/api/notion/oauth?code=${codeFromUrl}`, {
                        method: 'GET',
                        headers: {
                            Accept: 'application/json',
                        },
                    });
                } catch (error) {
                    console.error('Error fetching OAuth token:', error);
                }
            }
        };

        fetchData();
    }, [data?.allowedAccess?.allowNotionAccess]);

    const handleDatabaseChange = async (event: React.ChangeEvent<HTMLSelectElement>) => {
        const databaseId = event.target.value;
        console.log('Database changed');

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
                //console.log(tasksData);

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
        console.log('Updated tasks state:', tasks);
    }, [tasks]);

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
                {!user.allowNotionAccess ? (
                    <a
                        href={data?.authUrl}
                        className="bg-green-400 py-3 px-4 rounded-lg border-none hover:bg-white hover:text-green-600"
                    >
                        Quick Setup
                    </a>
                ) : (
                    <div className="px-4">
                        <h1 className="text-white font-bold font-sans text-2xl py-8">Welcome {user.username}</h1>
                        <select id="databaseSelector" value={selectedDatabaseId} onChange={handleDatabaseChange}>
                            <option value="">-- Select a Database --</option>
                            {filteredDatabases?.map((database: any) => (
                                <option key={database.id} value={database.id}>
                                    {database.title[0].plain_text}
                                </option>
                            ))}
                        </select>

                        {tasks && tasks.length > 0 && (
                            <div>
                                <h2 className="text-white mt-6 text-xl font-semibold leading-tight tracking-wider">Tasks:</h2>
                                <ul>
                                    {tasks.map((task: any) => (
                                        <li className="text-slate-300 leading-normal tracking-tighter" key={task.id}>{task.properties['Task name'].title[0].plain_text}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                        {/* You can render additional content based on the selected database and tasks */}
                    </div>
                )}
            </section>
        </main>
    );
};

export default Dashboard;