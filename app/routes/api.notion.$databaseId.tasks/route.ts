import { LoaderFunctionArgs, json } from "@remix-run/node";
import invariant from "tiny-invariant";
import { getNotionClient } from "~/models/notion.server";

export const loader = async ({ params,request }: LoaderFunctionArgs) => {
  invariant(params.databaseId, "DatabaseId not found");
  const selectedDatabaseId = params.databaseId;
  console.log(selectedDatabaseId);

  try {
    const notion = await getNotionClient(request);
    const databaseTasks = await notion.databases.query({
      database_id: selectedDatabaseId,
    });

    console.log(databaseTasks);

    return json({ tasks: databaseTasks.results });
  } catch (error) {
    console.error('Error fetching tasks from Notion:', error);
    return json({ error: 'Failed to fetch tasks from Notion' }, 500) as never;
  }
};
