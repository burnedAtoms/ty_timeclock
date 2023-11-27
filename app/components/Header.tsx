import { Form, Link } from "@remix-run/react";

import { User } from '~/models/user.server';

interface Props {
    email: User["email"],
}



const Header = ({ email }: Props): JSX.Element => {

    async function handleDisconnect() {
        try {
            const response = await fetch("/dashboard", {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    isDisconnect: true
                })
            });

            const responseData = await response.json();
            console.log('Disconnect response:', responseData);

        } catch (error) {
            console.error('Error disconnecting Notion:', error);
        }
    }

    return (
        <header className="relative top-0 flex items-center justify-between bg-slate-800 p-4 text-white">
            <h1 className="text-3xl font-bold">
                <Link to=".">Time Clock</Link>
            </h1>
            <p>{email}</p>
            <Form action="/logout" method="post">
                <button
                    type="submit"
                    className="rounded bg-slate-600 px-4 py-2 text-blue-100 hover:bg-blue-500 active:bg-blue-600"
                >
                    Logout
                </button>
            </Form>
            <button className="rounded bg-red-600 px-4 py-2 text-white hover:bg-blue-500 active:bg-blue-600" onClick={handleDisconnect}>Disconnect Notion</button>
        </header>
    )
}

export default Header;