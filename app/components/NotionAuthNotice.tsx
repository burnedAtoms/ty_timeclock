// This component is a popup that displays a notice to the user that authication will take a minute to authicate.

import { useState } from "react";
import { Popup } from "reactjs-popup";

interface AuthNoticeProps {
    isOpenProp: boolean,
    authUrlProp:string
}

const NotionAuthNotice = ({isOpenProp, authUrlProp} : AuthNoticeProps) => {

    const [isOpen, setIsOpen] = useState(isOpenProp);
    return (
        <Popup
            open={isOpen} 
            closeOnDocumentClick
            modal
            contentStyle={{
                padding: 20,
                border: 'none',
                backgroundColor: '#fff',
                borderRadius: 10,
            }}
            overlayStyle={{
                backgroundColor: 'rgba(0, 0, 0, 0.5)', 
            }}
        >
            <div className="notice-container flex flex-col gap-3 justify-center items-center">
                <p className="auth-notice-text text-slate-500 py-2 px-4">
                    Notion authentication might take a minute. Please be patient while we
                    verify your credentials.
                </p>
                <a href={authUrlProp} className="understand-button px-4 py-2 text-white font-semibold bg-red-600 rounded border-none hover:bg-red-800 hover:text-white tracking-normal" onClick={() => {setIsOpen(false)}}>
                    I understand!
                </a>
            </div>
        </Popup>
    )
}

export default NotionAuthNotice;