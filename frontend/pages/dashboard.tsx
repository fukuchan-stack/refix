import { useUser } from '@auth0/nextjs-auth0/client';
import { useEffect, useState, FormEvent, Fragment } from 'react';
import Link from 'next/link';
import Head from 'next/head';
import { ThemeSwitcher } from '../components/ThemeSwitcher';
import { ScoreTrendChart } from '../components/ScoreTrendChart';
import { Menu, Transition, Dialog } from '@headlessui/react';
import { FiMoreVertical, FiTrash2, FiEdit, FiEye, FiEyeOff } from 'react-icons/fi';
import { BsGripVertical } from 'react-icons/bs';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// --- 型定義 ---
interface Project {
  id: number;
  name: string;
  github_url: string;
  user_id: string;
  description: string | null;
  language: string | null;
  stars: number;
  average_score: number | null;
  last_reviewed_at: string | null;
  sort_order: number;
}

const timeAgo = (dateString: string | null): string => {
    if (!dateString) return 'No reviews yet';
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " years ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " months ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " days ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " hours ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " minutes ago";
    return Math.floor(seconds) + " seconds ago";
};

// --- ドラッグ可能なプロジェクトカードコンポーネント ---
const SortableProjectItem: React.FC<{ 
    project: Project; 
    hiddenScores: Record<number, boolean>; 
    onRename: () => void; 
    onDelete: () => void; 
    onToggleScore: () => void; 
}> = ({ project, hiddenScores, onRename, onDelete, onToggleScore }) => {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: project.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };
    
    const score = project.average_score ?? 0;
    const mockScoreHistory = [
        { name: '5d', score: Math.max(0, score - 15 + Math.random() * 10) },
        { name: '4d', score: Math.max(0, score - 5 + Math.random() * 10) },
        { name: '3d', score: Math.max(0, score - 10 + Math.random() * 15) },
        { name: '2d', score: Math.min(100, score + 10 + Math.random() * 5) },
        { name: '1d', score: score },
    ];
    const isScoreHidden = hiddenScores[project.id];

    return (
        <div ref={setNodeRef} style={style} className="flex items-center p-4 border rounded-lg bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:shadow-lg dark:hover:bg-gray-700 transition-all group relative">
            <div {...attributes} {...listeners} className="p-2 cursor-grab touch-none text-gray-400 hover:text-gray-700 dark:hover:text-gray-100">
                <BsGripVertical size={20} />
            </div>

            <Link href={`/projects/${project.id}`} className="flex-1 block ml-2">
                <div className="flex justify-between items-start">
                    <div>
                        <h3 className="font-bold text-xl text-blue-700 dark:text-blue-400 group-hover:underline">{project.name}</h3>
                        <p className="text-gray-600 dark:text-gray-300 text-sm mt-1">{project.description || 'No description'}</p>
                    </div>
                    {!isScoreHidden && project.average_score !== null && (
                        <div className="text-right flex-shrink-0 ml-4">
                            <p className="font-bold text-2xl text-gray-800 dark:text-gray-200">{Math.round(score)}<span className="text-base text-gray-500 dark:text-gray-400">/100</span></p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Avg. Score</p>
                        </div>
                    )}
                </div>
                {!isScoreHidden && (
                    <div className="mt-2 h-[60px]">
                        <ScoreTrendChart data={mockScoreHistory} />
                    </div>
                )}
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                    <span>{project.language || 'N/A'}</span>
                    <span>Last review: {timeAgo(project.last_reviewed_at)}</span>
                </div>
            </Link>
            
            <div className="absolute top-2 right-2">
                <Menu as="div" className="relative inline-block text-left">
                    <Menu.Button className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75">
                        <FiMoreVertical className="text-gray-500 dark:text-gray-400"/>
                    </Menu.Button>
                    <Transition as={Fragment} enter="transition ease-out duration-100" enterFrom="transform opacity-0 scale-95" enterTo="transform opacity-100 scale-100" leave="transition ease-in duration-75" leaveFrom="transform opacity-100 scale-100" leaveTo="transform opacity-0 scale-95">
                        <Menu.Items className="absolute right-0 mt-2 w-56 origin-top-right divide-y divide-gray-100 dark:divide-gray-700 rounded-md bg-white dark:bg-gray-800 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-10">
                            <div className="px-1 py-1 ">
                                <Menu.Item>
                                    {({ active }) => (<button onClick={onRename} className={`${active ? 'bg-blue-500 text-white' : 'text-gray-900 dark:text-gray-100'} group flex w-full items-center rounded-md px-2 py-2 text-sm`}> <FiEdit className="mr-2" /> 名前の変更 </button>)}
                                </Menu.Item>
                                <Menu.Item>
                                    {({ active }) => (<button onClick={onToggleScore} className={`${active ? 'bg-blue-500 text-white' : 'text-gray-900 dark:text-gray-100'} group flex w-full items-center rounded-md px-2 py-2 text-sm`}> {isScoreHidden ? <FiEye className="mr-2"/> : <FiEyeOff className="mr-2"/> } {isScoreHidden ? 'スコアを表示' : 'スコアを非表示'} </button>)}
                                </Menu.Item>
                            </div>
                            <div className="px-1 py-1">
                                <Menu.Item>
                                    {({ active }) => (<button onClick={onDelete} className={`${active ? 'bg-red-500 text-white' : 'text-red-600 dark:text-red-400'} group flex w-full items-center rounded-md px-2 py-2 text-sm`}> <FiTrash2 className="mr-2" /> 削除 </button>)}
                                </Menu.Item>
                            </div>
                        </Menu.Items>
                    </Transition>
                </Menu>
            </div>
        </div>
    );
};


export default function Dashboard() {
    const { user, error: authError, isLoading: isAuthLoading } = useUser();
    const [projects, setProjects] = useState<Project[]>([]);
    const [isProjectsLoading, setIsProjectsLoading] = useState(true);
    const [projectName, setProjectName] = useState('');
    const [githubUrl, setGithubUrl] = useState('');
    const apiKey = process.env.NEXT_PUBLIC_INTERNAL_API_KEY;
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

    const [projectToEdit, setProjectToEdit] = useState<Project | null>(null);
    const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
    const [newProjectName, setNewProjectName] = useState("");
    const [hiddenScores, setHiddenScores] = useState<Record<number, boolean>>({});

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const fetchProjects = async (current_user: any) => {
        if (!current_user || !current_user.sub) return;
        setIsProjectsLoading(true);
        try {
            const res = await fetch(`${apiBaseUrl}/api/projects/?user_id=${current_user.sub}`, {
                headers: { 'X-API-Key': apiKey || '' }
            });
            if (res.ok) {
                const data: Project[] = await res.json();
                setProjects(data);
            } else {
                console.error("Failed to fetch projects:", await res.text());
            }
        } catch (err) {
            console.error("Failed to fetch projects:", err);
        } finally {
            setIsProjectsLoading(false);
        }
    };

    useEffect(() => {
        if (user) {
            fetchProjects(user);
            const savedHiddenScores = localStorage.getItem('hiddenScores');
            if (savedHiddenScores) {
                setHiddenScores(JSON.parse(savedHiddenScores));
            }
        }
    }, [user]);

    useEffect(() => {
        if (Object.keys(hiddenScores).length > 0) {
            localStorage.setItem('hiddenScores', JSON.stringify(hiddenScores));
        }
    }, [hiddenScores]);

    const handleSubmit = async (event: FormEvent) => {
        event.preventDefault();
        if (!user?.sub) {
            alert('Login information could not be retrieved.');
            return;
        }
        const apiUrl = `${apiBaseUrl}/api/projects/`;
        const projectData = { name: projectName, github_url: githubUrl, user_id: user.sub };
        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey || '' },
                body: JSON.stringify(projectData),
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || `Error: ${response.status}`);
            }
            alert(`Project "${projectName}" has been registered!`);
            setProjectName('');
            setGithubUrl('');
            fetchProjects(user);
        } catch (error: any) {
            console.error('Failed to create project:', error);
            alert(`Failed to register project: ${error.message}`);
        }
    };

    const handleDeleteProject = async () => {
        if (!projectToDelete) return;
        try {
            const response = await fetch(`${apiBaseUrl}/api/projects/${projectToDelete.id}`, {
                method: 'DELETE',
                headers: { 'X-API-Key': apiKey || '' },
            });
            if (!response.ok) {
                throw new Error('Failed to delete project');
            }
            setProjects(projects.filter(p => p.id !== projectToDelete.id));
            setProjectToDelete(null);
        } catch (error) {
            console.error(error);
            alert('プロジェクトの削除に失敗しました。');
        }
    };

    const handleRenameProject = async (event?: FormEvent) => {
        if (event) event.preventDefault();
        if (!projectToEdit || !newProjectName.trim()) return;
        const originalProjects = projects;
        const editedProjectId = projectToEdit.id;
        setProjects(projects.map(p => p.id === editedProjectId ? { ...p, name: newProjectName } : p));
        setProjectToEdit(null);
        try {
            const response = await fetch(`${apiBaseUrl}/api/projects/${editedProjectId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey || '' },
                body: JSON.stringify({ name: newProjectName }),
            });
            if (!response.ok) { throw new Error('Server returned an error'); }
        } catch (error: any) {
            console.error(error);
            alert(`プロジェクト名の変更に失敗しました。表示を元に戻します。`);
            setProjects(originalProjects);
        }
    };

    const toggleScoreVisibility = (projectId: number) => {
        setHiddenScores(prev => ({ ...prev, [projectId]: !prev[projectId] }));
    };
    
    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            const oldIndex = projects.findIndex((p) => p.id === active.id);
            const newIndex = projects.findIndex((p) => p.id === over.id);
            const newOrderProjects = arrayMove(projects, oldIndex, newIndex);
            
            setProjects(newOrderProjects);

            const orderedIds = newOrderProjects.map(p => p.id);
            if (user?.sub) {
                fetch(`${apiBaseUrl}/api/projects/order`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey || '' },
                    body: JSON.stringify({ ordered_ids: orderedIds, user_id: user.sub }),
                }).catch(err => {
                    console.error("Failed to save order:", err);
                    fetchProjects(user);
                });
            }
        }
    };

    const handleAutoSort = async (sortKey: string) => {
        if (!user?.sub) return;
        if (sortKey === 'manual') return;

        setIsProjectsLoading(true);
        try {
            const response = await fetch(`${apiBaseUrl}/api/projects/reorder`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey || '' },
                body: JSON.stringify({ user_id: user.sub, sort_by: sortKey }),
            });
            if (!response.ok) {
                throw new Error('Failed to reorder projects');
            }
            const reorderedProjects = await response.json();
            setProjects(reorderedProjects);
        } catch (error) {
            console.error(error);
            alert('プロジェクトの並べ替えに失敗しました。');
        } finally {
            setIsProjectsLoading(false);
        }
    };
    
    if (isAuthLoading) return <div className="p-8">Loading user...</div>;
    if (authError) return <div className="p-8">{authError.message}</div>;

    return (
        <div className="bg-gray-50 dark:bg-black min-h-screen">
            <Head>
                <title>Refix - Dashboard</title>
            </Head>
            <div className="container mx-auto p-4 md:p-8">
                <header className="flex justify-between items-center mb-6">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Project Dashboard</h1>
                    {user && ( <div className="flex items-center space-x-4"> <ThemeSwitcher /> <span className="text-gray-600 dark:text-gray-300 hidden sm:inline">{user.name}</span> <a href="/api/auth/logout" className="bg-gray-200 hover:bg-gray-300 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 font-bold py-2 px-4 rounded transition-colors">Logout</a> </div> )}
                </header>
                
                {user && (
                    <main className="mt-10 p-6 border dark:border-gray-800 rounded-lg w-full bg-white dark:bg-black">
                        <div className="flex flex-col md:flex-row gap-10">
                            <div className="w-full md:w-1/3">
                                <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100">Register Project</h2>
                                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                                    <div>
                                        <label htmlFor="projectName" className="block text-left font-medium text-sm text-gray-700 dark:text-gray-300">Project Name</label>
                                        <input type="text" id="projectName" value={projectName} onChange={(e) => setProjectName(e.target.value)} required className="mt-1 p-2 w-full border rounded-md bg-gray-100 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-200"/>
                                    </div>
                                    <div>
                                        <label htmlFor="githubUrl" className="block text-left font-medium text-sm text-gray-700 dark:text-gray-300">GitHub Repository URL</label>
                                        <input type="url" id="githubUrl" value={githubUrl} onChange={(e) => setGithubUrl(e.target.value)} required className="mt-1 p-2 w-full border rounded-md bg-gray-100 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-200" placeholder="https://github.com/user/repo"/>
                                    </div>
                                    <button type="submit" className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white font-bold py-2 px-4 rounded transition-colors">Register</button>
                                </form>
                            </div>
                            <div className="w-full md:w-2/3 md:border-l md:border-gray-200 dark:md:border-gray-700 md:pl-10">
                                <div className="flex justify-between items-center mb-4">
                                    <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">My Projects</h2>
                                    <div className="flex items-center">
                                        <label htmlFor="sort-by" className="text-sm font-medium text-gray-600 dark:text-gray-400 mr-2">Sort by:</label>
                                        <select 
                                            id="sort-by"
                                            onChange={(e) => handleAutoSort(e.target.value)}
                                            className="rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200 text-sm py-1"
                                        >
                                            <option value="manual">手動の並び順</option>
                                            <option value="newest">作成日順（新しい順）</option>
                                            <option value="oldest">作成日順（古い順）</option>
                                            <option value="name_asc">名前順（A→Z）</option>
                                            <option value="name_desc">名前順（Z→A）</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    {isProjectsLoading ? (
                                        <div className="text-center py-10"> <p className="text-gray-500 dark:text-gray-400">プロジェクト一覧を読み込んでいます... 少しお待ちください。</p> </div>
                                    ) : projects.length > 0 ? (
                                        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                                            <SortableContext items={projects.map(p => p.id)} strategy={verticalListSortingStrategy}>
                                                {projects.map(project => (
                                                    <SortableProjectItem 
                                                        key={project.id}
                                                        project={project}
                                                        hiddenScores={hiddenScores}
                                                        onRename={() => { setProjectToEdit(project); setNewProjectName(project.name); }}
                                                        onDelete={() => setProjectToDelete(project)}
                                                        onToggleScore={() => toggleScoreVisibility(project.id)}
                                                    />
                                                ))}
                                            </SortableContext>
                                        </DndContext>
                                    ) : (
                                        <div className="text-center py-10"> <p className="text-gray-500 dark:text-gray-400">まだプロジェクトが登録されていません。</p> </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </main>
                )}
            </div>
            
            <Transition appear show={!!projectToEdit} as={Fragment}>
                <Dialog as="div" className="relative z-10" onClose={() => setProjectToEdit(null)}>
                    <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
                        <div className="fixed inset-0 bg-black bg-opacity-25" />
                    </Transition.Child>
                    <div className="fixed inset-0 overflow-y-auto">
                        <div className="flex min-h-full items-center justify-center p-4 text-center">
                            <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
                                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white dark:bg-gray-800 p-6 text-left align-middle shadow-xl transition-all">
                                    <form onSubmit={handleRenameProject}>
                                        <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900 dark:text-gray-100">
                                            プロジェクト名の変更
                                        </Dialog.Title>
                                        <div className="mt-2">
                                            <input type="text" value={newProjectName} onChange={(e) => setNewProjectName(e.target.value)} required autoFocus className="mt-1 p-2 w-full border rounded-md bg-gray-100 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-200" />
                                        </div>
                                        <div className="mt-4 flex justify-end space-x-2">
                                            <button type="button" className="inline-flex justify-center rounded-md border border-transparent bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2" onClick={() => setProjectToEdit(null)}>
                                                キャンセル
                                            </button>
                                            <button type="submit" className="inline-flex justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2">
                                                変更を保存
                                            </button>
                                        </div>
                                    </form>
                                </Dialog.Panel>
                            </Transition.Child>
                        </div>
                    </div>
                </Dialog>
            </Transition>

            <Transition appear show={!!projectToDelete} as={Fragment}>
                 <Dialog as="div" className="relative z-10" onClose={() => setProjectToDelete(null)}>
                    <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
                        <div className="fixed inset-0 bg-black bg-opacity-25" />
                    </Transition.Child>
                    <div className="fixed inset-0 overflow-y-auto">
                        <div className="flex min-h-full items-center justify-center p-4 text-center">
                            <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
                                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white dark:bg-gray-800 p-6 text-left align-middle shadow-xl transition-all">
                                    <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900 dark:text-gray-100">
                                        プロジェクトの削除の確認
                                    </Dialog.Title>
                                    <div className="mt-2">
                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                            本当にプロジェクト「{projectToDelete?.name}」を削除しますか？この操作は元に戻せません。
                                        </p>
                                    </div>
                                    <div className="mt-4 flex justify-end space-x-2">
                                        <button type="button" className="inline-flex justify-center rounded-md border border-transparent bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2" onClick={() => setProjectToDelete(null)}>
                                            キャンセル
                                        </button>
                                        <button type="button" className="inline-flex justify-center rounded-md border border-transparent bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2" onClick={handleDeleteProject}>
                                            削除
                                        </button>
                                    </div>
                                </Dialog.Panel>
                            </Transition.Child>
                        </div>
                    </div>
                </Dialog>
            </Transition>
        </div>
    );
}