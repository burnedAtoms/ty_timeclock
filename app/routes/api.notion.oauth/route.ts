// api/notion/oauth.js
import { NotionUser } from '@prisma/client';
import { LoaderFunctionArgs, json } from '@remix-run/node';

import { allowUserAccess, createNotionUser, findNotionUser, updateAccessToken } from '~/models/notion.server';
import { getUserId } from '~/session.server';

export const loader = async ({ request }: LoaderFunctionArgs) => {
    const url = new URL(request.url);
    const code = url.searchParams.get('code');
    console.log(code);

  const clientId = process.env.OAUTH_CLIENT_ID;
  const clientSecret = process.env.OAUTH_CLIENT_SECRET;
  const redirectUri = decodeURIComponent(process.env.OAUTH_REDIRECT_URI!);

  const encoded = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  try {
    const response = await fetch('https://api.notion.com/v1/oauth/token', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Basic ${encoded}`,
      },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirectUri,
      }),
    });

    const data = await response.json();
    if(data){
        const userId = await getUserId(request);
        const accessToken: NotionUser["accessToken"] = data?.access_token;
        const ownerId: NotionUser["ownerId"] = data?.owner?.user?.id;
        const botId: NotionUser["botId"] = data?.bot_id;
        const workspaceName: NotionUser["workspaceName"] = data?.workspace_name;
        const workspaceId: NotionUser["workspaceId"] = data?.workspace_id;
        if(!await findNotionUser(userId!)){
          await createNotionUser(userId!,accessToken,botId,ownerId,workspaceName,workspaceId);
        } else {
            if(await updateAccessToken(userId!,accessToken)){
                await allowUserAccess(userId!);
            }
        }
        
        
    }
    console.log('OAuth token exchange response:', data);

    return json({ result: 'OAuth token exchange completed' });
  } catch (error) {
    console.error('Error fetching OAuth token:', error);
    return json({ error: 'Failed to fetch OAuth token' }, 500);
  }
};
