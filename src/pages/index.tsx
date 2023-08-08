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
import {message, notification, Select} from 'antd';
import {IoSend} from "react-icons/io5";
import {BiMessageDetail} from "react-icons/bi";
import {darcula} from "react-syntax-highlighter/dist/cjs/styles/prism";
import {MdDeleteOutline, MdDriveFileRenameOutline, MdOutlineGridView} from "react-icons/md";
import {RiCheckFill, RiCloseFill, RiMoreLine} from "react-icons/ri";
import {TbCircleKeyFilled, TbSettingsFilled} from "react-icons/tb";
import Link from "next/link";
import {v4 as uuidv4} from "uuid";
import {IoIosArrowRoundForward} from "react-icons/io";
import Head from "next/head";

const inter = Inter({subsets: ['latin']})

export default function Home() {

    const [inputValue, setInputValue] = useState<string>('');
    const [chatLogs, setChatLogs] = useState<ChatMessage[]>([]);
    const chatLogsRef = useRef<ChatMessage[]>(chatLogs);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [chatTitles, setChatTitles] = useState<ChatTitle[]>([]);
    // 使用 useRef 来保存 currentTitle 的值，确保了在异步回调函数中使用的是最新的值
    const [currentTitleId, setCurrentTitleId] = useState<string>('')
    const currentTitleIdRef = useRef<string>(currentTitleId);
    const [currentChatLogs, setCurrentChatLogs] = useState<ChatMessage[]>([]);
    const [showSideBarFlag, setShowSideBarFlag] = useState<boolean>(false);
    const [showSettingsFlag, setShowSettingsFlag] = useState<boolean>(false);
    const [settingsOption, setSettingsOption] = useState<string>('');
    const [inputApikey, setInputApikey] = useState<string>('');
    const [editedText, setEditedText] = useState<string>('');
    const [editingIndex, setEditingIndex] = useState<number>(-1);
    const inputEditedRef = useRef(null);
    // 代码块复制通知
    const [notificationApi, contextHolderNotification] = notification.useNotification();
    const [messageApi, contextHolderMessage] = message.useMessage();
    const chatContentRef = useRef<HTMLDivElement>(null);

    // 在组件加载时从本地存储中检索chatLogs
    useEffect(() => {
        const storedChatLogs = localStorage.getItem('CHAT-LOGS');
        const storedChatTitles = localStorage.getItem('CHAT-TITLES');
        if (storedChatLogs && storedChatTitles) {
            chatLogsRef.current = JSON.parse(storedChatLogs) as ChatMessage[];
            setChatTitles(JSON.parse(storedChatTitles) as ChatTitle[]);
        }
        const storedApikey = localStorage.getItem("OPENAI-API-KEY");
        if (storedApikey) {
            setInputApikey(storedApikey);
        }
    }, []);

    // 当chatLogs发生变化时，将其保存到本地存储中，并实时滑动到底部
    useEffect(() => {
        if (chatLogsRef && chatLogsRef.current.length !== 0 && chatLogs.length === 0) {
            setCurrentChatLogs(chatLogs.filter(chatLog => chatLog.id === currentTitleId));
            setChatLogs(chatLogsRef.current);
        } else {
            setCurrentChatLogs(chatLogs.filter(chatLog => chatLog.id === currentTitleId));
            localStorage.setItem('CHAT-LOGS', JSON.stringify(chatLogs));
            localStorage.setItem('CHAT-TITLES', JSON.stringify(chatTitles));
            chatLogsRef.current = [];

            // 在 React 中，更新状态是异步的，因此在更新状态后立即设置滚动位置时，可能无法正确计算出最新的滚动高度。为了确保滚动位置能够正确应用，你可以将设置滚动位置的代码包裹在一个 setTimeout 函数中，以便稍微延迟一下执行。
            setTimeout(() => {
                chatContentRef.current!.scrollTop = chatContentRef.current!.scrollHeight;
            }, 0);
        }

    }, [chatLogs, currentTitleId]);

    const acquireModelList = () => {
        const url = "https://api.openai.com/v1/models";
        const header = {
            "Content-Type": "application/json",
            // "Authorization": `Bearer ${process.env.NEXT_PUBLIC_OPENAI_API_KEY}`
            "Authorization": `Bearer ${inputApikey}`
        };
        axios.get(url, {headers: header}).then(res => {
            console.log(res);
        }).catch(error => {
            console.log(error);
        })
    }

    const handleSubmit = () => {
        if (!inputApikey || !localStorage.getItem("OPENAI-API-KEY")) {
            handleApikeyNotExist();
        } else {
            if (!currentTitleId && inputValue) {
                const uuid = uuidv4()
                setChatTitles((prevChatTitles) => [
                    ...prevChatTitles,
                    {
                        id: uuid,
                        title: inputValue
                    }
                ]);

                setCurrentTitleId(uuid);
                currentTitleIdRef.current = uuid;
            }

            setChatLogs((prevChatLogs) => [
                ...prevChatLogs,
                {
                    id: currentTitleIdRef.current,
                    role: "user",
                    content: inputValue
                }
            ])

            // const url = "/api/chat";
            const url = "https://api.openai.com/v1/chat/completions";
            const header = {
                "Content-Type": "application/json",
                // "Authorization": `Bearer ${process.env.NEXT_PUBLIC_OPENAI_API_KEY}`
                "Authorization": `Bearer ${inputApikey}`
            };
            const prevChatRequestMessages = currentChatLogs.map(({id, role, content}) => ({role, content}));
            const chatRequestMessages = [...prevChatRequestMessages, {role: 'user', content: inputValue}];
            const data = {
                model: "gpt-3.5-turbo",
                messages: chatRequestMessages,
            }

            setIsLoading(true);

            axios.post(url, data, {headers: header}).then((res) => {
                setChatLogs((prevChatLogs) => [
                    ...prevChatLogs,
                    {
                        id: currentTitleIdRef.current,
                        role: res.data.choices[0].message.role,
                        content: res.data.choices[0].message.content
                    }
                ])
                setIsLoading(false);
            }).catch((error) => {
                if (error.response.status === 429) {
                    setChatLogs((prevChatLogs) => [
                        ...prevChatLogs,
                        {
                            id: currentTitleIdRef.current,
                            role: 'assistant',
                            content: '抱歉，您的输入过快，请稍后重试~'
                        }
                    ])
                }
                setIsLoading(false);
                console.log(error);
            })
            setInputValue('');
        }
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

    const handleClear = () => {
        messageApi.open({
            type: 'warning',
            content: '所有聊天已清除！',
        }).then(() => {
        });
    };

    const handleApikeyNotExist = () => {
        notificationApi.error({
            message: 'ApiKey不存在！',
            description:
                '请在Open AI官网生成自己的KEY并设置！!',
            duration: 5,
        });
    };

    const handleSaveApikeySuccess = () => {
        messageApi.open({
            type: 'success',
            content: 'ApiKey已保存！',
        }).then(() => {
        });
    };

    const handleSaveApikeyError = () => {
        messageApi.open({
            type: 'error',
            content: '您未输入ApiKey，请重新输入！',
        }).then(() => {
        });
    };

    const createNewChat = () => {
        setInputValue('');
        setCurrentTitleId('');
    }

    const titleSwitch = (currentTitle: string) => {
        setCurrentTitleId(currentTitle);
        currentTitleIdRef.current = currentTitle;
    }

    const deleteTitle = (titleId: string) => {
        // 删除 chatLogs 中对应的部分
        setChatLogs(chatLogs.filter(chatLog => chatLog.id !== titleId));
        setChatTitles(chatTitles.filter(chatTitle => chatTitle.id !== titleId));

        setCurrentTitleId('');
        setInputValue('')

        messageApi.open({
            type: 'success',
            content: '相应标题会话删除成功！',
        }).then(() => {
        });
    }

    const handleInputKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault(); // 阻止默认的换行行为
            // 在此处执行提交操作，例如调用提交函数或处理表单数据
            handleSubmit();
        }
    }

    const showSideBar = () => {
        setShowSideBarFlag(!showSideBarFlag);
    }

    const showSettings = () => {
        setShowSettingsFlag(!showSettingsFlag);
        setSettingsOption("general");
    }

    const clearAllChats = () => {
        localStorage.removeItem('CHAT-LOGS');
        localStorage.removeItem('CHAT-TITLES');
        setCurrentTitleId('');
        setChatLogs([]);
    }

    const openSettingsOption = (option: string) => {
        // console.log(option)
        setSettingsOption(option);
    }

    const handleSaveApiKey = () => {
        if (!inputApikey) {
            handleSaveApikeyError();
        } else {
            localStorage.setItem('OPENAI-API-KEY', inputApikey);
            handleSaveApikeySuccess();
        }
    }

    const findTitleByCurrentId = () => {
        const currentChatTitle = chatTitles.find((chatTitle) => chatTitle.id === currentTitleId);
        if (currentChatTitle) {
            return currentChatTitle.title;
        }
    }

    const editingTitle = (index: number, chatTitle: ChatTitle) => {
        // 在点击修改按钮后，将鼠标焦点聚焦到输入框
        // 聚焦的操作可能在渲染过程中发生得太早。在某些情况下，由于渲染和更新的顺序，需要在聚焦之前等待一些时间。
        // 使用 setTimeout 设置延迟为 0 的方式通常被用来推迟一个任务，以确保它在当前任务完成后执行，而不会阻塞其他任务的执行。这样可以确保在下一个事件循环周期中执行聚焦操作，以确保输入框已经正确渲染并可见。
        setTimeout(() => {
            (inputEditedRef.current as unknown as HTMLInputElement)?.focus();
        }, 0);
        setEditedText(chatTitle.title);
        setEditingIndex(index);
    }

    const saveNewTitle = (titleId: string) => {
        setChatTitles(prevTitles => {
            const newChatTitles = prevTitles.map(chatTitle => {
                if (chatTitle.id === titleId) {
                    return {
                        ...chatTitle,
                        title: editedText
                    };
                }
                return chatTitle;
            });

            localStorage.setItem('CHAT-TITLES', JSON.stringify(newChatTitles));
            return newChatTitles;
        });

        setEditingIndex(-1);
        setEditedText('');

        messageApi.open({
            type: 'success',
            content: '会话标题更新成功！',
        }).then(() => {
        });
    }

    const handleEditingIndex = () => {
        setEditingIndex(-1);
        setEditedText('');
    }

    return (
        <>
            <Head>
                <meta name="viewport"
                      content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"/>
            </Head>
            <div className="chat text-[0.9rem]">
                {contextHolderMessage}
                {contextHolderNotification}

                {/*侧边栏*/}
                <section className={`chat-side-bar ${showSideBarFlag ? 'show-menu' : ''}`}>
                    <button className="new-chat" onClick={createNewChat}>+ New chat</button>
                    {/*这里有一个flex布局，设置中间的高度为100%即可填充满*/}
                    <ul className="chat-history d m-[10px] text-left h-[100%] ">
                        {
                            chatTitles?.map((chatTitle, index) => {
                                return <div key={index}>
                                    <li className={`flex items-center justify-between hover:bg-[#2a2b32] hover:cursor-pointer p-4 list-none rounded-[5px] ${chatTitle.id === currentTitleId ? 'bg-[#343541]' : ''}`}
                                        onClick={() => titleSwitch(chatTitle.id)}>
                                        <BiMessageDetail className="inline mr-3"/>
                                        {
                                            editingIndex === index ? (
                                                <input
                                                    className="bg-transparent focus:outline-none border-[1px] border-blue-500 rounded-[5px] w-full mr-3 text-ellipsis line-clamp-1 p-1"
                                                    type="text"
                                                    value={editedText}
                                                    onChange={(event) => setEditedText(event.target.value)}
                                                    ref={inputEditedRef}
                                                />
                                            ) : (
                                                <span
                                                    className="chat-history-title inline text-left w-[100%] text-ellipsis line-clamp-1">{chatTitle.title}</span>
                                            )
                                        }

                                        {editingIndex === index ?
                                            <div className="flex justify-between items-center gap-1">
                                                <RiCheckFill className="hover:text-blue-500"
                                                             onClick={() => saveNewTitle(chatTitle.id)}/>
                                                <RiCloseFill className="inline ml-3 hover:text-red-500"
                                                             onClick={handleEditingIndex}/>
                                            </div>
                                            :
                                            <div className="flex justify-between items-center gap-1">
                                                <MdDriveFileRenameOutline className="hover:text-blue-500"
                                                                          onClick={() => editingTitle(index, chatTitle)}/>
                                                <MdDeleteOutline className="inline ml-3 hover:text-red-500"
                                                                 onClick={(event) => {
                                                                     event.stopPropagation(); // 阻止事件冒泡
                                                                     deleteTitle(chatTitle.id)
                                                                 }}
                                                />
                                            </div>
                                        }
                                    </li>
                                </div>
                            })
                        }
                    </ul>
                    <nav className="flex flex-col gap-1 border-t border-solid border-white border-opacity-50 px-2 py-3">
                        <Link href="https://www.huangrx.cn">
                            <button
                                className="appearance-none focus:outline-none flex justify-between items-center w-full px-2 py-3 hover:bg-[#343541] rounded-[5px]">
                                <div>
                                    Blog
                                </div>
                                <IoIosArrowRoundForward className="h-4 w-4 flex-shrink-0 text-gray-500"/>
                            </button>
                        </Link>
                        <button
                            className="appearance-none focus:outline-none flex justify-between items-center w-full px-2 py-3 hover:bg-[#343541] rounded-[5px]"
                            onClick={showSettings}>
                            <div>
                                Settings
                            </div>
                            <RiMoreLine className="h-4 w-4 flex-shrink-0 text-gray-500"/>

                        </button>
                    </nav>
                </section>

                {/*聊天记录界面*/}
                <section className="chat-body h-[100%]  flex flex-col bg-[#444654]">
                    <div className="flex justify-start items-center md:invisible md:hidden px-6 py-2 bg-[#343541]">
                        <MdOutlineGridView className="justify-start" onClick={showSideBar}/>
                        <div className="justify-end flex-grow text-center">
                            {findTitleByCurrentId() as React.ReactNode}
                        </div>
                    </div>

                    <div className="chat-body-content justify-center flex-grow overflow-y-auto" ref={chatContentRef}>
                        {
                            currentTitleId.length === 0 ?
                                <div className="h-[100%] text-center mx-auto">
                                    <div
                                        className="text-white bg-clip-text pt-[5vh] md:pt-[15vh] font-bold text-[20px] pb-[2vh]">Huangrx&apos;s
                                        Chat Ai Bot
                                    </div>
                                    <div className="flex justify-center items-center gap-5 py-3">
                                        <div className="text-[1.2rem]">
                                            Model:
                                        </div>
                                        <Select
                                            defaultValue="gpt-3.5-turbo"
                                            style={{width: 180, backgroundColor: "#202123"}}
                                            options={[
                                                {value: 'gpt-3.5-turbo', label: 'gpt-3.5-turbo'},
                                                {value: 'gpt-4', label: 'gpt-4'}
                                            ]}
                                            onClick={acquireModelList}
                                        />
                                    </div>
                                    <div className="cards">
                                        <article className="card card--1">
                                            <div className="card__img"></div>
                                            <a href="https://platform.openai.com/docs/guides/gpt" className="card_link">
                                                <div className="card__img--hover"></div>
                                            </a>
                                            <div className="card__info">
                                                <span className="card__category">Introducing ChatGPT</span>
                                                <div className="card__title my-2 line-clamp-3 text-ellipsis">OpenAI 的
                                                    GPT（生成式预训练转换器）模型经过训练可以理解自然语言和代码。GPT
                                                    提供文本输出以响应其输入。GPT 的输入也称为“提示”。设计提示本质上是您“编程”GPT
                                                    模型的方式，通常是通过提供说明或一些示例来说明如何成功完成任务。
                                                </div>
                                            </div>
                                        </article>
                                    </div>
                                </div>
                                :
                                <div className="chat-body-message w-[100%]">
                                    <div className="space-y-4">
                                        {
                                            currentChatLogs?.map((chatLog, index) => {
                                                return (
                                                    <div key={index}>
                                                        <div
                                                            className={`${chatLog.role === 'user' ? 'bg-customBlack' : 'bg-customBlack2'}`}>
                                                            <div
                                                                className="flex p-4 gap-4 leading-8 text-white md:gap-6 md:max-w-2xl lg:max-w-[38rem] xl:max-w-3xl md:py-6 lg:px-0 m-auto ">
                                                                <div className="min-w-[24px] min-h-[24px] pt-1">
                                                                    {
                                                                        chatLog.role !== 'user' ?
                                                                            <svg d="1686038749044" className="icon"
                                                                                 viewBox="0 0 1024 1024"
                                                                                 version="1.1"
                                                                                 xmlns="http://www.w3.org/2000/svg"
                                                                                 p-id="2749"
                                                                                 id="mx_n_1686038749045" width="24"
                                                                                 height="24">
                                                                                <path
                                                                                    d="M939.7888 421.4144a248.832 248.832 0 0 0-21.376-204.3904 251.6608 251.6608 0 0 0-271.0656-120.7424A248.832 248.832 0 0 0 459.648 12.608a251.6864 251.6864 0 0 0-240.0896 174.2592 248.9216 248.9216 0 0 0-166.4 120.704 251.6992 251.6992 0 0 0 30.9504 295.1168 248.832 248.832 0 0 0 21.3888 204.3904 251.6864 251.6864 0 0 0 271.0656 120.7424 248.832 248.832 0 0 0 187.6864 83.6736 251.6736 251.6736 0 0 0 240.1664-174.3488 248.9216 248.9216 0 0 0 166.4-120.7168 251.6992 251.6992 0 0 0-31.04-295.0144zM564.352 946.2016a186.6624 186.6624 0 0 1-119.8208-43.328c1.5104-0.832 4.1728-2.2784 5.9008-3.3536L649.3184 784.64a32.3328 32.3328 0 0 0 16.3328-28.288V475.9296l84.0704 48.5376a3.008 3.008 0 0 1 1.6384 2.304v232.2176a187.4304 187.4304 0 0 1-187.008 187.2z m-402.1888-171.776a186.5472 186.5472 0 0 1-22.336-125.44c1.472 0.8832 4.0576 2.4576 5.9008 3.52l198.8992 114.8928a32.3712 32.3712 0 0 0 32.6656 0l242.8288-140.2112v97.0752a3.008 3.008 0 0 1-1.2032 2.5856l-201.0496 116.0832a187.392 187.392 0 0 1-255.7056-68.5056zM109.824 340.224a186.5088 186.5088 0 0 1 97.4336-82.0736c0 1.7152-0.1024 4.736-0.1024 6.848v229.7728a32.32 32.32 0 0 0 16.3328 28.288l242.816 140.1856-84.0576 48.5376a3.008 3.008 0 0 1-2.8416 0.256L178.3296 595.84A187.392 187.392 0 0 1 109.824 340.224z m690.688 160.7296L557.696 360.7424l84.0576-48.512a3.008 3.008 0 0 1 2.8288-0.256l201.088 116.0832a187.2256 187.2256 0 0 1-28.928 337.8176V529.2416a32.3072 32.3072 0 0 0-16.2304-28.288z m83.6736-125.9264c-1.4848-0.9088-4.0576-2.4704-5.9136-3.5328l-198.8864-114.88a32.4096 32.4096 0 0 0-32.6656 0L403.8912 396.8256v-97.088a3.008 3.008 0 0 1 1.2032-2.5856l201.0496-115.9808a187.2128 187.2128 0 0 1 278.0416 193.856zM358.1824 548.0576l-84.096-48.5376a3.008 3.008 0 0 1-1.6256-2.304V264.9984a187.2128 187.2128 0 0 1 307.008-143.744 172.8 172.8 0 0 0-5.9136 3.3408l-198.8864 114.88a32.32 32.32 0 0 0-16.3456 28.288l-0.1408 280.2944z m45.6704-98.4576L512 387.136l108.16 62.4256v124.8896L512 636.8768l-108.16-62.4256v-124.8512z"
                                                                                    fill="#975dd6" p-id="2750"></path>
                                                                            </svg>
                                                                            :
                                                                            <svg d="1686039628073" className="icon"
                                                                                 viewBox="0 0 1024 1024"
                                                                                 version="1.1"
                                                                                 xmlns="http://www.w3.org/2000/svg"
                                                                                 p-id="12240"
                                                                                 width="24" height="24">
                                                                                <path
                                                                                    d="M498.602667 191.744a204.714667 204.714667 0 0 1 116.906666 372.8c133.162667 47.317333 229.077333 173.290667 231.893334 322.026667l0.085333 6.784h-64c0-157.333333-127.573333-284.885333-284.885333-284.885334-155.136 0-281.301333 123.968-284.821334 278.250667l-0.085333 6.613333h-64c0-151.68 96.810667-280.746667 232-328.810666a204.714667 204.714667 0 0 1 116.906667-372.8z m0 64a140.714667 140.714667 0 1 0 0 281.450667 140.714667 140.714667 0 0 0 0-281.450667z"
                                                                                    fill="#2d848a" p-id="12241"></path>
                                                                            </svg>
                                                                    }
                                                                </div>

                                                                {
                                                                    chatLog.role === 'user' ? <div
                                                                            className="whitespace-pre-wrap">{chatLog.content}</div> :
                                                                        <ReactMarkdown
                                                                            className="markdown-body overflow-auto"
                                                                            remarkPlugins={[remarkGfm]}
                                                                            rehypePlugins={[rehypeRaw]}
                                                                            components={{
                                                                                code({
                                                                                         node,
                                                                                         inline,
                                                                                         className,
                                                                                         children,
                                                                                         ...props
                                                                                     }) {
                                                                                    const match = /language-(\w+)/.exec(className || '');
                                                                                    return !inline && match ?
                                                                                        (
                                                                                            <CopyToClipboard
                                                                                                text={String(children).replace(/\n$/, '')}>
                                                                                                <div
                                                                                                    className="code-wrapper relative">
                                                                                                    <SyntaxHighlighter
                                                                                                        language={match[1]}
                                                                                                        PreTag="div"
                                                                                                        {...props}
                                                                                                        className='code'
                                                                                                        style={darcula}
                                                                                                    >
                                                                                                        {String(children).replace(/\n$/, '')}
                                                                                                    </SyntaxHighlighter>
                                                                                                    <div
                                                                                                        className="copy-btn absolute right-1 top-1 text-black leading-5"
                                                                                                        onClick={handleCopy}>
                                                                                                        复制
                                                                                                    </div>
                                                                                                </div>
                                                                                            </CopyToClipboard>
                                                                                        )
                                                                                        :
                                                                                        (

                                                                                            <span
                                                                                                className="code code-not-language">
                                                                            <code className={className} {...props}>
                                                                                {children}
                                                                            </code>
                                                                        </span>

                                                                                        );
                                                                                },
                                                                            }}
                                                                        >
                                                                            {chatLog.content}
                                                                        </ReactMarkdown>
                                                                }
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
                                                    className="flex p-4 pl-0 gap-4 leading-8 text-white md:gap-6 md:max-w-2xl lg:max-w-[38rem] xl:max-w-3xl md:py-6 lg:px-0 m-auto">
                                                    <div
                                                        className="flex rounded-lg p-4 text-white">
                                                        <TypingAnimation/>
                                                    </div>
                                                </div>
                                            </div>
                                        }
                                    </div>
                                </div>
                        }
                    </div>

                    <div className="chat-body-input bg-transparent justify-end  w-[100%]">
                        <div className="w-4/5 md:w-1/2 m-auto  pt-8">
                            <div
                                className="flex justify-between items-center rounded-lg bg-customGray w-full flex-grow p2-4">
                                <textarea
                                    className="chat-body-textarea flex-grow h-[24px] rounded-l-xl bg-customGray text-white focus:outline-none whitespace-pre-wrap appearance-none resize-none px-6"
                                    placeholder="Type your message ..."
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    onKeyDown={(e) => handleInputKeyDown(e)}
                                    disabled={isLoading}/>
                                <button
                                    className="roudned-lg p-4 y-[15px] md:p-6 rounded-r-xl text-white font-semibold focus:outline-none transition-colors duration-300"
                                    type="submit"
                                    onClick={handleSubmit}
                                >
                                    <IoSend style={{width: "20px"}}/>
                                </button>
                            </div>

                            <p className="text-center text-white text-[0.1rem] mb-3 mt-2 md:mb-8 md:mt-5">Free Research
                                Preview. ChatGPT may
                                produce
                                inaccurate information about people, places, or facts. ChatGPT May 24 Version</p>
                        </div>
                    </div>
                </section>

                {/*chat-side-bar 在小屏幕端时的关闭按钮*/}
                <div className={`${showSideBarFlag ? 'show-menu-close md:invisible md:hidden' : 'invisible hidden'}`}>
                    <RiCloseFill className="show-menu-close-icon" onClick={showSideBar}/>
                </div>

                {/*设置页面*/}
                <div
                    className={`${showSettingsFlag ? 'show-settings bg-black bg-opacity-80 flex items-center justify-center' : 'invisible hidden'}`}>
                    <div
                        className="bg-[#202123] max-w-[90vw] min-w-[80vw] md:max-w-[680px] md:min-w-[680px] min-h-[500px] rounded-[5px] pb-12">
                        <div
                            className="flex justify-between items-center border-b border-[#373839] px-4 pb-4 pt-5 sm:p-6 text-[1rem] font-bold">
                            <div>
                                <h2>Settings</h2>
                            </div>
                            <div className="hover:cursor-pointer">
                                <RiCloseFill className="" onClick={showSettings}/>
                            </div>
                        </div>
                        <div className="flex flex-col md:flex-row justify-between gap-3 px-4 pb-4 pt-5 sm:p-6">
                            <div
                                className="flex flex-row md:flex-col md:w-1/4 bg-[#26272c] md:bg-transparent p-1 rounded-[5px]">
                                <button
                                    className={'general' === settingsOption ? 'flex-grow appearance-none focus:outline-none flex justify-between items-center gap-2 rounded-md px-2 py-1.5 bg-[#343541] h-[3rem] max-h-[3rem]' : 'flex-grow appearance-none focus:outline-none flex justify-between items-center gap-2 rounded-md px-2 py-1.5 h-[3rem] max-h-[3rem]'}
                                    onClick={() => openSettingsOption("general")}>
                                    <div>
                                        <TbSettingsFilled/>
                                    </div>
                                    <div className="flex-grow text-left">
                                        General
                                    </div>
                                </button>
                                <button
                                    className={'apikey' === settingsOption ? 'flex-grow appearance-none focus:outline-none flex justify-between items-center gap-2 rounded-md px-2 py-1.5 bg-[#343541]  h-[3rem] max-h-[3rem]' : 'flex-grow appearance-none focus:outline-none flex justify-between items-center gap-2 rounded-md px-2 py-1.5 h-[3rem] max-h-[3rem]'}
                                    onClick={() => openSettingsOption("apikey")}>
                                    <div>
                                        <TbCircleKeyFilled/>
                                    </div>
                                    <div className="flex-grow text-left">
                                        Apikey
                                    </div>
                                </button>
                            </div>
                            <div
                                className={'general' === settingsOption ? 'flex-grow flex flex-col gap-3 h-full px-2 py-1.5' : 'hidden invisible'}>
                                <div className="flex justify-between items-center border-b pb-3 border-[#373839]">
                                    <div>
                                        Theme
                                    </div>
                                    <select
                                        className="rounded-[5px] border border-[#373839] text-gray-500 bg-transparent px-1 py-2">
                                        <option value="system">System</option>
                                        <option value="dark">Dark</option>
                                        <option value="light">Light</option>
                                    </select>
                                </div>
                                <div className="flex justify-between items-center pb-3">
                                    <div>
                                        Clear all chats
                                    </div>
                                    <button className="bg-red-500 px-3 py-1.5 rounded-[5px] hover:bg-red-700"
                                            onClick={clearAllChats}>
                                        <div className="flex w-full gap-2 items-center justify-center"
                                             onClick={handleClear}>Clear
                                        </div>
                                    </button>
                                </div>
                            </div>
                            <div
                                className={'apikey' === settingsOption ? 'flex-grow flex flex-col gap-3 h-full px-2 py-3 md:py-1.5' : 'hidden invisible'}>
                                <div className="flex flex-col gap-5 border-b pb-3 border-[#373839]">
                                    <div>
                                        <input
                                            className="bg-transparent border-b-2 border-dashed border-b-[#ea95e0] p-1 mr-3 focus:outline-none w-full"
                                            value={inputApikey}
                                            onChange={(e) => setInputApikey(e.target.value)}
                                            type="text" required/>
                                    </div>
                                    <div className="flex justify-end">
                                        <button className="bg-[#40414f] px-3 py-1.5 rounded-[5px] hover:bg-gray-500"
                                                onClick={handleSaveApiKey}>保存
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    )
}

interface ChatMessage {
    id: string;
    role: string;
    content: string;
}

interface ChatTitle {
    id: string;
    title: string;
}