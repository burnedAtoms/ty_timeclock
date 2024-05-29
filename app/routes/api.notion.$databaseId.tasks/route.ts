import { LoaderFunctionArgs, json } from "@remix-run/node";
import invariant from "tiny-invariant";

import { fetchTasksInBackground } from "~/models/timer/functions/startTimer";
import { getSession } from "~/session.server";

export const loader = async ({ params, request }: LoaderFunctionArgs) => {
    const session = await getSession(request);
    invariant(params.databaseId, "Database ID not found");

    const selectedDatabaseId = params.databaseId;

    if (session.get('selectedDatabaseId') !== selectedDatabaseId) {
        session.set('selectedDatabaseId', selectedDatabaseId);
    }

    if (!selectedDatabaseId) {
        console.log('No database selected.');
        return json({ error: 'No database selected.' }, { status: 400 });
    }

    fetchTasksInBackground(request,selectedDatabaseId);
    return null;
};