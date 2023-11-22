// ... (imports)

import { ActionFunctionArgs, LoaderFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { useEffect } from "react";

import Header from "~/components/Header";
import { disconnectNotionUser } from "~/models/notion.server";
import { getUserId } from "~/session.server";
import { useUser } from "~/utils";

export const loader: LoaderFunction = async () => {
    const authUrl = process.env.AUTH_URL;
    return json({ authUrl });
  };

export async function action({
  request,
}: ActionFunctionArgs) {
  const body = await request.json();
  const isDisconnect = body.isDisconnect;

  if (isDisconnect) {
    // Assuming you have the user ID available
    const userID = await getUserId(request);
    
    // Call the function to disconnect Notion user
    await disconnectNotionUser(userID!);

    return json({ success: true });
  }

  return json({ success: false, message: 'Invalid action' }, 400);
}
  
  const Dashboard = () => {
    const data = useLoaderData<typeof loader>();
    const user = useUser();
  
    useEffect(() => {
      const fetchData = async () => {
        const urlParams = new URLSearchParams(window.location.search);
        const codeFromUrl = urlParams.get('code');
        console.log(`Code From URL: ${codeFromUrl}`);
  
        if (codeFromUrl) {  
          try {
            const response = await fetch(`/api/notion/oauth?code=${codeFromUrl}`, {
              method: 'GET',
              headers: {
                Accept: 'application/json',
              },
            });
  
            const responseData = await response.json();
            console.log('OAuth token exchange response:', responseData);
  
            // Perform other actions based on the response if needed
          } catch (error) {
            console.error('Error fetching OAuth token:', error);
          }
        }
      };
  
      fetchData();
    }, []); 
  
  
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
            <h1>Welcome</h1>
          )}
        </section>
      </main>
    );
  };
  
  export default Dashboard;
  