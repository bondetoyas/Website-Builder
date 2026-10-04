import axios from 'axios'
import { Code2, ExternalLink, LoaderCircle, MessageSquare, Monitor, Rocket, Send, X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import Editor from '@monaco-editor/react';

const THINKING_STEPS = [
    "Understanding your request...",
    "Planning layout changes...",
    "Improving responsiveness...",
    "Applying animations...",
    "Finalizing Update..."
]

const WebsiteEditor = () => {
    const [website, setWebsite] = useState(null)
    const [error, setError] = useState("")
    const [deployError, setDeployError] = useState("")
    const [deployLoading, setDeployLoading] = useState(false)
    const [code, setCode] = useState("")
    const [messages, setMessages] = useState([])
    const [prompt, setPrompt] = useState("")
    const [updateError, setUpdateError] = useState("")
    const { id } = useParams()
    const [updateLoading, setUpdateLoading] = useState(false)
    const [thinkingIndex, setThinkingIndex] = useState(0)
    const [showCode, setShowCode] = useState(false)
    const [showFullPreview, setShowFullPreview] = useState(false)
    const [showChat, setShowChat] = useState(false)
    const handleDeploy = async () => {
        const deployTab = window.open('about:blank', '_blank')
        setDeployError("")
        setDeployLoading(true)
        try {
            const result = await axios.get(`${import.meta.env.VITE_SERVER_URL}/api/website/deploy/${website._id}`, { withCredentials: true })
            const deployUrl = new URL(result.data.url, window.location.origin).toString()
            setWebsite((currentWebsite) => ({ ...currentWebsite, deployed: true, deployUrl }))
            if (deployTab) {
                deployTab.location.replace(deployUrl)
            } else {
                setDeployError('Your browser blocked the new tab. Use Open Site to view the published website.')
            }
        } catch (error) {
            deployTab?.close()
            setDeployError(error.response?.data?.message || 'Unable to deploy this website. Check the server connection and try again.')
        } finally {
            setDeployLoading(false)
        }
    }

    useEffect(() => {
        const intervalId = setInterval(() => {
            setThinkingIndex((i) => (i + 1) % THINKING_STEPS.length)
        }, 1200)
        return () => clearInterval(intervalId)
    }, [updateLoading])

    const handleUpdate = async (event) => {
        event.preventDefault()
        const requestPrompt = prompt.trim()
        if (!requestPrompt || updateLoading) return

        setUpdateError("")
        setMessages((currentMessages) => [...currentMessages, { role: "user", content: requestPrompt }])
        setPrompt("")
        setUpdateLoading(true)
        try {
            const result = await axios.post(`${import.meta.env.VITE_SERVER_URL}/api/website/update/${id}`, { prompt: requestPrompt }, { withCredentials: true })
            setMessages((currentMessages) => [...currentMessages, { role: "ai", content: result.data.message }])
            setCode(result.data.code)
            setWebsite((currentWebsite) => ({ ...currentWebsite, latestCode: result.data.code }))
        } catch (error) {
            setPrompt(requestPrompt)
            setUpdateError(error.response?.data?.message || "Couldn't apply that change. Your request is still in the box; please try again.")
        } finally {
            setUpdateLoading(false)
        }
    }

    const renderChangeComposer = () => (
        <div className='p-3 border-t border-white/10'>
            <form onSubmit={handleUpdate} className='flex gap-2'>
                <textarea
                    value={prompt}
                    onChange={(event) => setPrompt(event.target.value)}
                    onKeyDown={(event) => {
                        if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
                            event.preventDefault()
                            event.currentTarget.form?.requestSubmit()
                        }
                    }}
                    rows={2}
                    aria-label='Describe changes'
                    disabled={updateLoading}
                    placeholder='Describe a change to your website...'
                    className='flex-1 resize-none rounded-2xl px-4 py-3 bg-white/5 border border-white/10 text-white outline-none disabled:opacity-60' />
                <button
                    type='submit'
                    aria-label={updateLoading ? 'Applying changes' : 'Apply changes'}
                    title={updateLoading ? 'Applying changes' : 'Apply changes'}
                    disabled={updateLoading || !prompt.trim()}
                    className='self-end px-4 py-3 rounded-2xl bg-white text-black disabled:opacity-40'
                >
                    {updateLoading ? <LoaderCircle size={18} className='animate-spin' /> : <Send size={18} />}
                </button>
            </form>
            {updateError && <p role='alert' className='mt-2 text-xs text-red-400'>{updateError}</p>}
        </div>
    )

    useEffect(() => {
        const handleGetWebsite = async () => {
            try {
                const result = await axios.get(`${import.meta.env.VITE_SERVER_URL}/api/website/getbyid/${id}`, { withCredentials: true })
                setWebsite(result.data)
                setCode(result.data.latestCode)
                setMessages(result.data.conversation)
            } catch (error) {
                setError(error.response?.data?.message || 'Unable to load this website. Check the server connection and try again.')
                console.log(error)
            }
        }
        handleGetWebsite()
    }, [id])

    if (error) {
        return (
            <div className='h-screen flex items-center justify-center bg-black text-red-400'>{error}</div>
        )
    }
    if (!website) {
        return (
            <div className='h-screen flex items-center justify-center bg-black text-white'>Loading...</div>
        )
    }
    return (
        <div className='h-screen w-screen flex bg-black text-white overflow-hidden'>
            <aside className='hidden lg:flex w-95 flex-col border-r border-white/10 bg-black/80'>
                <Header />
                <>
                    <div className='flex-1 overflow-y-auto px-4 py-4 space-y-4'>
                        {messages.map((m, i) => {
                            return <div key={i} className={`max-w-[85%] ${m.role === "user" ? "ml-auto" : "mr-auto"}`}>
                                <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed 
                            ${m.role === "user" ? "bg-white text-black" : "bg-white/5 border border-white/10 text-zinc-200"}`}
                                >
                                    {m.content}
                                </div>
                            </div>
                        })}
                        {updateLoading && <div className='max-w-[85%] mr-auto'>
                            <div className='px-4 py-2.5 rounded-2xl text-xs bg-white/5 border border-white/10 text-zinc-400 italic'>{THINKING_STEPS[thinkingIndex]}</div>
                        </div>}
                    </div>

                    {renderChangeComposer()}
                </>
            </aside>

            {/* preview */}
            <div className='flex-1 flex flex-col'>
                <div className='h-14 px-4 flex justify-between items-center border-b border-white/10 bg-black/80'>
                    <span className='text-xs text-zinc-400'>Live Preview</span>
                    <div className='flex gap-2'>
                        {website.deployed ? (
                            <a href={website.deployUrl} target='_blank' rel='noreferrer' className='flex items-center gap-2 px-4 py-1.5 rounded-lg bg-white/10 text-sm font-semibold hover:bg-white/20 transition'>
                                <ExternalLink size={14} />Open Site
                            </a>
                        ) : (
                            <button disabled={deployLoading} onClick={handleDeploy} className='flex items-center gap-2 px-4 py-1.5 rounded-lg bg-linear-to-r from-indigo-500 to-purple-500 text-sm font-semibold hover:scale-105 transition disabled:opacity-60'>
                                <Rocket size={14} />{deployLoading ? 'Deploying...' : 'Deploy'}
                            </button>
                        )}
                      
                        <button onClick={() => setShowChat(true)} className='p-2 lg:hidden'><MessageSquare size={18} /></button>
                        <button onClick={() => setShowCode(true)} className='p-2'><Code2 size={18} /></button>
                        <button onClick={() => setShowFullPreview(true)} className='p-2'><Monitor size={18} /></button>
                    </div>

                </div>
                {deployError && <p role='alert' className='px-4 py-2 text-sm text-red-400'>{deployError}</p>}
                <iframe srcDoc={code} className='flex-1 w-full bg-white' sandbox='allow-scripts allow-same-origin allow-forms'/>
            </div>

            {/* mobile chat preview */}
            <AnimatePresence>
                {showChat && (
                    <motion.div
                        initial={{ y: "100%" }}
                        animate={{ y: 0 }}
                        exit={{ y: "100%" }}
                        className='fixed inset-0 z-9999 flex flex-col bg-black'
                    >
                        <Header />
                        <>
                            <div className='flex-1 overflow-y-auto px-4 py-4 space-y-4'>
                                {messages.map((m, i) => {
                                    return <div key={i} className={`max-w-[85%] ${m.role === "user" ? "ml-auto" : "mr-auto"}`}>
                                        <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed 
                            ${m.role === "user" ? "bg-white text-black" : "bg-white/5 border border-white/10 text-zinc-200"}`}
                                        >
                                            {m.content}
                                        </div>
                                    </div>
                                })}
                                {updateLoading && <div className='max-w-[85%] mr-auto'>
                                    <div className='px-4 py-2.5 rounded-2xl text-xs bg-white/5 border border-white/10 text-zinc-400 italic'>{THINKING_STEPS[thinkingIndex]}</div>
                                </div>}
                            </div>

                            {renderChangeComposer()}
                        </>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showCode && (
                    <motion.div
                        initial={{ x: "100%" }}
                        animate={{ x: 0 }}
                        exit={{ x: "100%" }}
                        className='fixed inset-y-0 right-0 w-full lg:w-[45%] z-9999 flex flex-col bg-[#1e1e1e]'
                    >
                        <div className='h-12 px-4 flex justify-between items-center border-b border-white/10 bg-[#1e1e1e]'>
                            <span className='text-sm font-medium'>index.html</span>
                            <button onClick={() => setShowCode(false)}><X size={18} /></button>
                        </div>
                        <Editor theme='vs-dark' value={code} language='html' onChange={(v) => setCode(v)} />
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showFullPreview && (
                    <motion.div className='fixed inset-0 bg-black z-9999'>
                        <iframe className='w-full h-full bg-white' srcDoc={code} sandbox='allow-scripts allow-same-origin allow-forms'></iframe>
                        <button onClick={() => setShowFullPreview(false)} className='absolute top-4 right-4 p-2 bg-black/70 rounded-lg'><X /></button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )

    function Header() {
        return (
            <div className='h-14 px-4 flex items-center justify-between border-b border-white/10'>
                <span className='font-semibold truncate'>{website.title}</span>
                <button onClick={()=>setShowChat(false)} className='lg:hidden'><X/></button>
            </div>
        )
    }


}

export default WebsiteEditor
