// ... (imports)

import { LoaderFunction } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { json } from "@remix-run/node";
import { useState, useEffect } from "react";
import Header from "~/components/Header";
import { allowUserAccess, findNotionUser } from "~/models/notion.server";
import { useUser } from "~/utils";

export const loader: LoaderFunction = async ({ request }) => {
    const authUrl = process.env.AUTH_URL;
    return json({ authUrl });
  };
  
  const Dashboard = () => {
    const data = useLoaderData<typeof loader>();
    const user = useUser();
    const [oauthCode, setOAuthCode] = useState("");
  
    useEffect(() => {
      const fetchData = async () => {
        const urlParams = new URLSearchParams(window.location.search);
        const codeFromUrl = urlParams.get('code');
        console.log(`Code From URL: ${codeFromUrl}`);
  
        if (codeFromUrl) {
          setOAuthCode(codeFromUrl);
  
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
  
    useEffect(() => {
      const updateUserAccess = async () => {
        if (!user.allowNotionAccess && (await findNotionUser(user.id))) {
          allowUserAccess(user.id);
        }
      };
  
      updateUserAccess();
    }, [user]);
  
    return (
      <main className="flex-col min-h-screen min-w-screen">
        <Header email={user.email} userId={user.id} />
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
  