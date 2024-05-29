/* eslint-disable @typescript-eslint/no-explicit-any */

import { ActionFunctionArgs, LoaderFunction, LoaderFunctionArgs, json, redirect } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { useEffect, useRef, useState } from "react";

import Header from "~/components/Header";
import NotionAuthNotice from "~/components/NotionAuthNotice";
import { NotionOauth, deleteNotionClient, disconnectNotionUser, getNotionClient, getUserAllowAccess, searchDatabases } from "~/models/notion.server";
import { SELECTED_DATABASE_KEY, getUserId } from "~/session.server";
import { useUser } from "~/utils";

export const loader: LoaderFunction = async ({ request }: LoaderFunctionArgs) => {
    const authUrl = process.env.AUTH_URL;
    let allowedAccess;
    const user = await getUserId(request);
    const url = new URL(request.url);
    const code = url.searchParams.get('code');
    if (code) {
        await NotionOauth(request, code!);
        return redirect("/dashboard");
    } else {
        if (user) {
            allowedAccess = await getUserAllowAccess(user!);
        }
    
        if (allowedAccess?.allowNotionAccess === true) {
            //console.log("user access",request);
            try {
                const client = await getNotionClient(request);
                if(client){
                    let data = await searchDatabases(user!);
                    console.log(data);
                    let fetchDatabasesUpperLimit  = 0;
                    while(!data.results[0] || fetchDatabasesUpperLimit < 15){
                        console.log("searching for databases...");
                        data = await searchDatabases(user!);
                        console.log(data);
                        fetchDatabasesUpperLimit++;
                    }
                    return json({data,allowedAccess});
                }
                
                
            } catch (error) {
                console.error('Error fetching data from Notion:', error);
                return json({ error: 'Failed to fetch data from Notion' }, 500) as never;
            }
        }else {
            await deleteNotionClient(user!);
            console.log("user Deleted");

        }
    }

    console.log("outside");
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

    const user = useUser();

    const [selectedDatabaseId, setSelectedDatabaseId] = useState('');
    const [filteredDatabases,setFilterDatabases] = useState([]);
    const [isOpen, setIsOpen] = useState<boolean>(false);

    const isMountedRef = useRef(false);
    const databaseChangecontroller = new AbortController();
    const fetchTasksController = new AbortController();

    const databaseChangeSignal = databaseChangecontroller.signal;
    const fetchTasksSignal = fetchTasksController.signal;


    useEffect(() => {
        return () => {
            if (isMountedRef.current) {
                fetchTasksController.abort();
                console.log("Fetch Tasks aborted 2.");
            }
        };
    });

    useEffect(() => {
        if (!user.allowNotionAccess) {
            console.log("Notion Disconnected...");
            fetchTasksController.abort();
            databaseChangecontroller.abort();
            localStorage.removeItem(SELECTED_DATABASE_KEY);
        }
    },[user,user?.allowNotionAcces]);

    useEffect(() => {
        const storedDatabaseId = localStorage.getItem(SELECTED_DATABASE_KEY);
        if (storedDatabaseId && !selectedDatabaseId) {
            console.log("selected Id set", storedDatabaseId);
            setSelectedDatabaseId(storedDatabaseId);
        }
    }, [selectedDatabaseId]);


    const handleDatabaseChange = async (event: React.ChangeEvent<HTMLSelectElement>) => {
        const databaseId = event.target.value;
        console.log('Database changed');
    
        setSelectedDatabaseId(databaseId);
        isMountedRef.current = true;
        localStorage.setItem(SELECTED_DATABASE_KEY, databaseId);
    
        if (databaseId) {
            try {
                await fetch(`/api/notion/${databaseId}/tasks`, { signal: databaseChangeSignal });
            } catch (error) {
                console.error('Error in HandleDatabaseChange function fetching tasks from Notion:', error);
            }
        } 
    };



    useEffect(() => {
        async function fetchTasks() {
            console.log("Fetch tasks called");
            try {
                await fetch(`/api/notion/${selectedDatabaseId}/tasks`, { signal: fetchTasksSignal });
            } catch (error) {
                // log error
            }
        }
    
        if (!isMountedRef.current && selectedDatabaseId) {
            fetchTasks(); 
        }
    
        return () => {
            fetchTasksController.abort();
            console.log("Fetch Tasks aborted 1.");
        };
    }, [selectedDatabaseId]);

    useEffect(() => {
        const filteredDatabases = data?.data?.results.filter((database: any) => {
            console.log("Render databases...");
            return (
                database.properties &&
                database.properties['Tiaoyueh Time Clock']
            );
        });

        setFilterDatabases(filteredDatabases);
    },[data?.data?.results]);



    return (
        <main className="min-h-screen min-w-screen">
            <section className="flex flex-col relative min-h-screen bg-gray-600">
                <Header email={user.email} />
                {(!user.allowNotionAccess) ? <button
                    onClick={() => { setIsOpen(true)}}
                    className="bg-green-400 m-4 w-fit py-3 px-4 rounded-lg border-none hover:bg-white hover:text-green-600"
                >
                    Quick Setup
                </button> : null}
                {(isOpen) ? <NotionAuthNotice isOpenProp={isOpen} authUrlProp={data?.authUrl} /> : null}
                {(user.allowNotionAccess) ? <div className="px-4">
                    <h1 className="text-white font-bold font-sans text-2xl py-8"> Welcome {user.username}</h1>
                    <select id="databaseSelector" value={selectedDatabaseId} onChange={handleDatabaseChange}>
                        <option value="">-- Select a Database --</option>
                        {filteredDatabases?.map((database: any) => (
                            <option key={database.id} value={database.id}>
                                {database.title[0].plain_text}
                            </option>
                        ))}
                    </select>
                    {/* You can render additional content based on the selected database and tasks */}
                </div> : null}
            </section>
        </main>
    );
};

export default Dashboard;

