import { LoaderFunctionArgs, json } from "@remix-run/node";
import invariant from "tiny-invariant";

import { getNotionClient } from "~/models/notion.server";
import { getSession } from "~/session.server";

export const loader = async ({params, request}: LoaderFunctionArgs) => {
    const session = await getSession(request);
    invariant(params.databaseId, "Database ID not found");

    const selectedDatabaseId = params.databaseId;

    if(session.get('selectedDatabaseId') !== selectedDatabaseId){
        session.set('selectedDatabaseId',selectedDatabaseId);
    }
    
    if (!selectedDatabaseId) {
        console.log('No database selected.');
        return json({ error: 'No database selected.' }, { status: 400 });
    }

    const notionClient = await getNotionClient(request);
    
    try {
        const databaseTasks = await notionClient.databases.query({
            database_id: selectedDatabaseId,
        });

        //console.log(`Fetched tasks for database ${selectedDatabaseId}:`, databaseTasks.results);

        return json({ tasks: databaseTasks.results });
    } catch (error) {
        console.error('Error fetching Notion updates:', error);
        return json({ error: 'Error fetching Notion updates.' }, { status: 500 });
    }
};