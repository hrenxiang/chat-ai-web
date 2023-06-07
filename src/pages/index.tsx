import {Inter} from 'next/font/google'
import React, {useEffect, useRef, useState} from "react";
import axios from "axios";
import TypingAnimation from "@/components/TypingAnimation";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import ReactMarkdown from 'react-markdown';
import {Prism as SyntaxHighlighter} from 'react-syntax-highlighter';
import {CopyToClipboard} from 'react-copy-to-clipboard';
import {HiOutlineCheck} from 'react-icons/hi'
import {notification} from 'antd';
import {IoSend} from "react-icons/io5";
import {BiMessageDetail} from "react-icons/bi";

const inter = Inter({subsets: ['latin']})

export default function Home() {

    const [inputValue, setInputValue] = useState<string>('');
    const [chatLogs, setChatLogs] = useState<ChatMessage[]>([]);
    const chatLogsRef = useRef<ChatMessage[]>(chatLogs);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    // 使用 useRef 来保存 currentTitle 的值，确保了在异步回调函数中使用的是最新的值
    const [currentTitle, setCurrentTitle] = useState<string>('')
    const currentTitleRef = useRef<string>(currentTitle);
    const [currentChatLogs, setCurrentChatLogs] = useState<ChatMessage[]>([]);
    const [uniqueTitles, setUniqueTitles] = useState<string[]>([]);
    // 代码块复制通知
    const [notificationApi, contextHolderNotification] = notification.useNotification();
    const chatContentRef = useRef<HTMLDivElement>(null);

    // 在组件加载时从本地存储中检索chatLogs
    useEffect(() => {
        const storedChatLogs = localStorage.getItem('CHAT-LOGS');
        if (storedChatLogs) {
            chatLogsRef.current = JSON.parse(storedChatLogs) as ChatMessage[];
        }
    }, []);

    // 当chatLogs发生变化时，将其保存到本地存储中，并实时滑动到底部
    useEffect(() => {
        if (chatLogsRef && chatLogsRef.current.length !== 0 && chatLogs.length === 0) {
            setCurrentChatLogs(chatLogs.filter(chatLog => chatLog.title === currentTitle));
            setUniqueTitles(Array.from(new Set(chatLogsRef.current.map(chatLog => chatLog.title))));
            setChatLogs(chatLogsRef.current);
        } else {
            setCurrentChatLogs(chatLogs.filter(chatLog => chatLog.title === currentTitle));
            setUniqueTitles(Array.from(new Set(chatLogs.map(chatLog => chatLog.title))));
            localStorage.setItem('CHAT-LOGS', JSON.stringify(chatLogs));

            chatLogsRef.current = [];
        }

        // 在 React 中，更新状态是异步的，因此在更新状态后立即设置滚动位置时，可能无法正确计算出最新的滚动高度。为了确保滚动位置能够正确应用，你可以将设置滚动位置的代码包裹在一个 setTimeout 函数中，以便稍微延迟一下执行。
        setTimeout(() => {
            chatContentRef.current!.scrollTop = chatContentRef.current!.scrollHeight;
            // if (chatContentRef.current) {
            //     chatContentRef.current.scrollIntoView({ behavior: 'smooth' });
            // }
        }, 0);


    }, [chatLogs, currentTitle]);

    const handleSubmit = (event: React.FormEvent) => {
        event.preventDefault();

        if (!currentTitle && inputValue) {
            setCurrentTitle(inputValue);
            currentTitleRef.current = inputValue;
        }

        setChatLogs((prevChatLogs) => [
            ...prevChatLogs,
            {
                title: currentTitleRef.current,
                type: "user",
                message: inputValue
            }
        ])

        sendMessage(inputValue);
        setInputValue('');
    }

    const sendMessage = (message: string) => {
        const url = "/api/chat";
        // const url = "https://api.openai.com/v1/chat/completions";
        // const header = {
        //     "Content-Type": "application/json",
        //     "Authorization": `Bearer ${process.env.NEXT_PUBLIC_OPENAI_API_KEY}`
        // };
        const data = {
            model: "gpt-3.5-turbo",
            messages: [{"role": "user", "content": message}],
        }

        setIsLoading(true);

        axios.post(url, data).then((res) => {
            setChatLogs((prevChatLogs) => [
                ...prevChatLogs,
                {
                    title: currentTitleRef.current,
                    type: res.data.choices[0].message.role,
                    message: res.data.choices[0].message.content
                }
            ])
            setIsLoading(false);
        }).catch((error) => {
            setIsLoading(false);
            console.log(error);
        })
    }

    const handleCopy = () => {
        notificationApi.open({
            message: '已复制！',
            description:
                '代码复制到剪贴板!',
            icon: <HiOutlineCheck/>,
            duration: 2,
        });
    };

    const createNewChat = () => {
        setInputValue('');
        setCurrentTitle('');
    }

    const uniqueTitleSwitch = (currentTitle: string) => {
        setCurrentTitle(currentTitle);
        currentTitleRef.current = currentTitle;
    }

    return (
        <div className="chat">

            {contextHolderNotification}

            <section className="chat-side-bar">
                <button className="hover:bg-gray-500" onClick={createNewChat}>+ New chat</button>
                {/*这里有一个flex布局，设置中间的高度为100%即可填充满*/}
                <ul className="chat-history d m-[10px] text-left h-[100%] ">
                    {
                        uniqueTitles?.map((uniqueTitle, index) => {
                            return <div key={index}>
                                <li className={`hover:bg-[#2a2b32] hover:cursor-pointer p-4 list-none rounded-[5px] ${uniqueTitle === currentTitle ? 'bg-[#343541]' : ''}`}
                                    onClick={() => uniqueTitleSwitch(uniqueTitle)}
                                >
                                    <BiMessageDetail className="inline mr-3"/>
                                    {uniqueTitle}
                                </li>
                            </div>
                        })
                    }
                </ul>
                <nav>
                    <p>
                        Made By Huangrx
                    </p>
                </nav>
            </section>
            <section className="chat-body h-[100%]  flex flex-col bg-[#444654]">

                <div className="chat-body-content justify-start flex-grow overflow-y-auto" ref={chatContentRef}>
                    {
                        !currentTitle &&
                        <h1 className="text-white bg-clip-text text-center py-8 font-bold text-[20px]">Chat AI</h1>
                    }

                    <div className="chat-body-message w-[100%]">
                        <div className="space-y-4">
                            {
                                currentChatLogs?.map((chatLog, index) => {
                                    return (
                                        <div key={index}>
                                            <div
                                                className={`${chatLog.type === 'user' ? 'bg-customBlack' : 'bg-customBlack2'}`}>
                                                <div
                                                    className="flex p-4 gap-4 text-[1rem] leading-8 text-white md:gap-6 md:max-w-2xl lg:max-w-[38rem] xl:max-w-3xl md:py-6 lg:px-0 m-auto ">
                                                    <div className="min-w-[24px] min-h-[24px] pt-1">
                                                        {
                                                            chatLog.type !== 'user' ?
                                                                <svg d="1686038749044" className="icon"
                                                                     viewBox="0 0 1024 1024"
                                                                     version="1.1"
                                                                     xmlns="http://www.w3.org/2000/svg" p-id="2749"
                                                                     id="mx_n_1686038749045" width="24"
                                                                     height="24">
                                                                    <path
                                                                        d="M939.7888 421.4144a248.832 248.832 0 0 0-21.376-204.3904 251.6608 251.6608 0 0 0-271.0656-120.7424A248.832 248.832 0 0 0 459.648 12.608a251.6864 251.6864 0 0 0-240.0896 174.2592 248.9216 248.9216 0 0 0-166.4 120.704 251.6992 251.6992 0 0 0 30.9504 295.1168 248.832 248.832 0 0 0 21.3888 204.3904 251.6864 251.6864 0 0 0 271.0656 120.7424 248.832 248.832 0 0 0 187.6864 83.6736 251.6736 251.6736 0 0 0 240.1664-174.3488 248.9216 248.9216 0 0 0 166.4-120.7168 251.6992 251.6992 0 0 0-31.04-295.0144zM564.352 946.2016a186.6624 186.6624 0 0 1-119.8208-43.328c1.5104-0.832 4.1728-2.2784 5.9008-3.3536L649.3184 784.64a32.3328 32.3328 0 0 0 16.3328-28.288V475.9296l84.0704 48.5376a3.008 3.008 0 0 1 1.6384 2.304v232.2176a187.4304 187.4304 0 0 1-187.008 187.2z m-402.1888-171.776a186.5472 186.5472 0 0 1-22.336-125.44c1.472 0.8832 4.0576 2.4576 5.9008 3.52l198.8992 114.8928a32.3712 32.3712 0 0 0 32.6656 0l242.8288-140.2112v97.0752a3.008 3.008 0 0 1-1.2032 2.5856l-201.0496 116.0832a187.392 187.392 0 0 1-255.7056-68.5056zM109.824 340.224a186.5088 186.5088 0 0 1 97.4336-82.0736c0 1.7152-0.1024 4.736-0.1024 6.848v229.7728a32.32 32.32 0 0 0 16.3328 28.288l242.816 140.1856-84.0576 48.5376a3.008 3.008 0 0 1-2.8416 0.256L178.3296 595.84A187.392 187.392 0 0 1 109.824 340.224z m690.688 160.7296L557.696 360.7424l84.0576-48.512a3.008 3.008 0 0 1 2.8288-0.256l201.088 116.0832a187.2256 187.2256 0 0 1-28.928 337.8176V529.2416a32.3072 32.3072 0 0 0-16.2304-28.288z m83.6736-125.9264c-1.4848-0.9088-4.0576-2.4704-5.9136-3.5328l-198.8864-114.88a32.4096 32.4096 0 0 0-32.6656 0L403.8912 396.8256v-97.088a3.008 3.008 0 0 1 1.2032-2.5856l201.0496-115.9808a187.2128 187.2128 0 0 1 278.0416 193.856zM358.1824 548.0576l-84.096-48.5376a3.008 3.008 0 0 1-1.6256-2.304V264.9984a187.2128 187.2128 0 0 1 307.008-143.744 172.8 172.8 0 0 0-5.9136 3.3408l-198.8864 114.88a32.32 32.32 0 0 0-16.3456 28.288l-0.1408 280.2944z m45.6704-98.4576L512 387.136l108.16 62.4256v124.8896L512 636.8768l-108.16-62.4256v-124.8512z"
                                                                        fill="#975dd6" p-id="2750"></path>
                                                                </svg>
                                                                :
                                                                <svg d="1686039628073" className="icon"
                                                                     viewBox="0 0 1024 1024"
                                                                     version="1.1" xmlns="http://www.w3.org/2000/svg"
                                                                     p-id="12240"
                                                                     width="24" height="24">
                                                                    <path
                                                                        d="M498.602667 191.744a204.714667 204.714667 0 0 1 116.906666 372.8c133.162667 47.317333 229.077333 173.290667 231.893334 322.026667l0.085333 6.784h-64c0-157.333333-127.573333-284.885333-284.885333-284.885334-155.136 0-281.301333 123.968-284.821334 278.250667l-0.085333 6.613333h-64c0-151.68 96.810667-280.746667 232-328.810666a204.714667 204.714667 0 0 1 116.906667-372.8z m0 64a140.714667 140.714667 0 1 0 0 281.450667 140.714667 140.714667 0 0 0 0-281.450667z"
                                                                        fill="#2d848a" p-id="12241"></path>
                                                                </svg>
                                                        }
                                                    </div>

                                                    <ReactMarkdown
                                                        className="markdown-body overflow-auto"
                                                        remarkPlugins={[remarkGfm]}
                                                        rehypePlugins={[rehypeRaw]}
                                                        children={chatLog.message}
                                                        components={{
                                                            code({node, inline, className, children, ...props}) {
                                                                const match = /language-(\w+)/.exec(className || '');
                                                                return !inline && match ?
                                                                    (
                                                                        <CopyToClipboard
                                                                            text={String(children).replace(/\n$/, '')}>
                                                                            <div className="code-wrapper relative">
                                                                                {/*@ts-ignore*/}
                                                                                <SyntaxHighlighter
                                                                                    language={match[1]}
                                                                                    PreTag="div"
                                                                                    children={String(children).replace(/\n$/, '')}
                                                                                    {...props}
                                                                                    className='code'
                                                                                />
                                                                                <div
                                                                                    className="copy-btn absolute right-1 top-1 text-black leading-6"
                                                                                    onClick={handleCopy}>
                                                                                    复制
                                                                                </div>
                                                                            </div>
                                                                        </CopyToClipboard>
                                                                    )
                                                                    :
                                                                    (

                                                                        <span className="code code-not-language">
                                                                            <code className={className} {...props}>
                                                                                {children}
                                                                            </code>
                                                                        </span>

                                                                    );
                                                            },
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                            {/*<hr className="text-black"/>*/}
                                        </div>

                                    )
                                })
                            }
                            {
                                isLoading &&
                                <div className="bg-customBlack2">
                                    <div
                                        className="flex p-4 pl-0 gap-4 text-[1rem] leading-8 text-white md:gap-6 md:max-w-2xl lg:max-w-[38rem] xl:max-w-3xl md:py-6 lg:px-0 m-auto">
                                        <div
                                            className="flex rounded-lg p-4 text-white">
                                            <TypingAnimation/>
                                        </div>
                                    </div>
                                </div>
                            }
                        </div>
                    </div>
                </div>

                <div className="chat-body-input bg-transparent justify-end  w-[100%]">
                    <form onSubmit={handleSubmit} className="w-3/4 m-auto  pt-8">
                        <div className="flex rounded-lg bg-customGray">
                            <input
                                className="flex-grow px-4 y-[10px] py-4 pl-4 rounded-l-xl bg-customGray text-white focus:outline-none"
                                type="text"
                                placeholder="Type your message ..."
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}/>
                            <button
                                className="roudned-lg px-4 y-[10px] md:py-4 md:pl-4 rounded-r-xl text-white font-semibold focus:outline-none hover:bg-gradient-to-r from-purple-500 to-gray-500 transition-colors duration-300"
                                type="submit"><IoSend style={{width: "20px"}}/></button>
                        </div>
                        <p className="text-center text-white text-[0.1rem] my-6">Free Research Preview. ChatGPT may
                            produce
                            inaccurate information about people, places, or facts. ChatGPT May 24 Version</p>
                    </form>
                </div>
            </section>
        </div>
    )
}

interface ChatMessage {
    title: string;
    type: string;
    message: string;
}