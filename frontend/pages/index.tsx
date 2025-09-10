import { useUser } from '@auth0/nextjs-auth0/client';
import { useEffect, useState, FormEvent } from 'react';
import Link from 'next/link';
import Head from 'next/head';
import { ThemeSwitcher } from '../components/ThemeSwitcher';

// Projectデータの型定義
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
}

// 日付を「〜前」という形式に変換するヘルパー関数
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

export default function Home() {
  const { user, error, isLoading } = useUser();
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectName, setProjectName] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const apiKey = process.env.NEXT_PUBLIC_INTERNAL_API_KEY;

  useEffect(() => {
    const fetchProjects = async (current_user: any) => {
      if (!current_user || !current_user.sub) return;
      try {
        const res = await fetch(`/api/projects/?user_id=${current_user.sub}`, {
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
      }
    };
    if (user) {
      fetchProjects(user);
    }
  }, [user, apiKey]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!user?.sub) {
      alert('Login information could not be retrieved.');
      return;
    }
    const apiUrl = '/api/projects/';
    const projectData = { name: projectName, github_url: githubUrl, user_id: user.sub };
    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey || ''
        },
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

  if (isLoading) return <div className="p-8">Loading...</div>;
  if (error) return <div className="p-8">{error.message}</div>;

  return (
    <div className="bg-gray-50 dark:bg-black min-h-screen">
      <Head>
        <title>Refix - Welcome</title>
      </Head>
      <div className="container mx-auto p-4 md:p-8">
        <header className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Welcome to Refix</h1>
          {user ? (
            <div className="flex items-center space-x-4">
              <ThemeSwitcher />
              <span className="text-gray-600 dark:text-gray-300 hidden sm:inline">{user.name}</span>
              <a href="/api/auth/logout" className="bg-gray-200 hover:bg-gray-300 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 font-bold py-2 px-4 rounded transition-colors">Logout</a>
            </div>
          ) : (
            <div className="flex items-center space-x-4">
              <ThemeSwitcher />
              <a href="/api/auth/login" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">Login / Sign Up</a>
            </div>
          )}
        </header>
        
        {user && (
          <main className="mt-10 p-6 border dark:border-gray-800 rounded-lg w-full bg-white dark:bg-gray-900">
            <div className="flex flex-col md:flex-row gap-10">
              {/* 左側: プロジェクト登録フォーム */}
              <div className="w-full md:w-1/3">
                <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100">Register Project</h2>
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                  <div>
                    <label htmlFor="projectName" className="block text-left font-medium text-sm text-gray-700 dark:text-gray-300">Project Name</label>
                    <input type="text" id="projectName" value={projectName} onChange={(e) => setProjectName(e.target.value)} required className="mt-1 p-2 w-full border rounded-md bg-gray-100 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200"/>
                  </div>
                  <div>
                    <label htmlFor="githubUrl" className="block text-left font-medium text-sm text-gray-700 dark:text-gray-300">GitHub Repository URL</label>
                    <input type="url" id="githubUrl" value={githubUrl} onChange={(e) => setGithubUrl(e.target.value)} required className="mt-1 p-2 w-full border rounded-md bg-gray-100 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200" placeholder="https://github.com/user/repo"/>
                  </div>
                  <button type="submit" className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white font-bold py-2 px-4 rounded transition-colors">Register</button>
                </form>
              </div>

              {/* 右側: プロジェクト一覧表示 */}
              <div className="w-full md:w-2/3 md:border-l md:border-gray-200 dark:md:border-gray-700 md:pl-10">
                <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100">My Projects</h2>
                <div className="space-y-4">
                  {projects.length > 0 ? (
                    projects.map(project => (
                      <Link 
                        href={`/projects/${project.id}`} key={project.id}
                        className="block p-4 border rounded-lg bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:shadow-lg dark:hover:bg-gray-700 hover:border-blue-500 transition-all cursor-pointer"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-bold text-xl text-blue-700 dark:text-blue-400">{project.name}</h3>
                            <p className="text-gray-600 dark:text-gray-300 text-sm mt-1">{project.description || 'No description'}</p>
                          </div>
                          {project.average_score !== null && (
                            <div className="text-right flex-shrink-0 ml-4">
                                <p className="font-bold text-2xl text-gray-800 dark:text-gray-200">{Math.round(project.average_score)}<span className="text-base text-gray-500 dark:text-gray-400">/100</span></p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Avg. Score</p>
                            </div>
                          )}
                        </div>
                        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                          <span>{project.language || 'N/A'}</span>
                          <span>Last review: {timeAgo(project.last_reviewed_at)}</span>
                        </div>
                      </Link>
                    ))
                  ) : (
                    <div className="text-center py-10">
                      <p className="text-gray-500 dark:text-gray-400">No projects have been registered yet.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </main>
        )}
      </div>
    </div>
  );
}