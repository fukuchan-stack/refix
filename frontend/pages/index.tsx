// frontend/src/pages/index.tsx

import { useUser } from '@auth0/nextjs-auth0/client';
import { useEffect, useState, FormEvent } from 'react';

// Projectデータの型を定義
interface Project {
  id: number;
  name: string;
  github_url: string;
  user_id: string;
}

export default function Home() {
  const { user, error, isLoading } = useUser();
  const [userData, setUserData] = useState(null);

  // --- StateをItemからProjectに変更 ---
  const [projects, setProjects] = useState<Project[]>([]);

  // --- バックエンドからProject一覧を取得する関数に変更 ---
  const fetchProjects = async (current_user: any) => {
    // userオブジェクト、特にuser.subが存在しない場合は何もしない
    if (!current_user || !current_user.sub) return;

    try {
      // user.subをuser_idとしてAPIに渡す
      const res = await fetch(`http://localhost:8000/projects/?user_id=${current_user.sub}`);
      if (res.ok) {
        const data: Project[] = await res.json();
        setProjects(data);
      }
    } catch (err) {
      console.error("Failed to fetch projects:", err);
    }
  };

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          setUserData(data);
          // ユーザーデータを取得できたら、そのユーザーのプロジェクト一覧を取得
          fetchProjects(data); 
        } else {
          setUserData(null);
        }
      } catch (err) {
        setUserData(null);
      }
    };

    if (user) {
      fetchUserData();
    } else {
      setUserData(null);
    }
  }, [user]);

  // --- フォームのStateもProject用に変更 ---
  const [projectName, setProjectName] = useState('');
  const [githubUrl, setGithubUrl] = useState('');

  // --- フォーム送信処理もProject用に変更 ---
  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    // ユーザー情報、特にuser.subがなければ処理を中断
    if (!userData || !user?.sub) {
        alert('ログイン情報が取得できません。');
        return;
    }

    const apiUrl = 'http://localhost:8000/projects/';
    const projectData = {
      name: projectName,
      github_url: githubUrl,
      user_id: user.sub, // Auth0のユーザーIDを一緒に送信
    };

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(projectData),
      });

      if (!response.ok) throw new Error(`Error: ${response.status}`);

      const createdProject = await response.json();
      console.log('Success:', createdProject);
      alert(`プロジェクト「${createdProject.name}」が登録されました！`);
      setProjectName('');
      setGithubUrl('');

      // プロジェクト作成後、一覧を再取得して画面を更新
      fetchProjects(userData);

    } catch (error) {
      console.error('Failed to create project:', error);
      alert('プロジェクトの登録に失敗しました。');
    }
  };

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>{error.message}</div>;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-2">
      <main className="flex flex-col items-center justify-center w-full flex-1 px-20 text-center">
        <h1 className="text-6xl font-bold">Welcome to Refix</h1>

        {userData ? (
          <div>
            <h2>Welcome {user?.name}</h2>
            <a href="/api/auth/logout">Logout</a>
          </div>
        ) : (
          <a href="/api/auth/login">Login</a>
        )}

        {user && (
          <div className="mt-10 p-6 border rounded-lg w-full max-w-4xl flex gap-10">
            {/* 左側: プロジェクト登録フォーム */}
            <div className="w-1/3">
              <h2 className="text-2xl font-bold mb-4">Register Project</h2>
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div>
                  <label htmlFor="projectName" className="block text-left font-medium">Project Name</label>
                  <input
                    type="text"
                    id="projectName"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    required
                    className="mt-1 p-2 w-full border rounded-md"
                  />
                </div>
                <div>
                  <label htmlFor="githubUrl" className="block text-left font-medium">GitHub URL</label>
                  <input
                    type="url"
                    id="githubUrl"
                    value={githubUrl}
                    onChange={(e) => setGithubUrl(e.target.value)}
                    required
                    className="mt-1 p-2 w-full border rounded-md"
                    placeholder="https://github.com/user/repo"
                  />
                </div>
                <button type="submit" className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
                  登録
                </button>
              </form>
            </div>

            {/* 右側: プロジェクト一覧表示 */}
            <div className="w-2/3 border-l pl-10">
                <h2 className="text-2xl font-bold mb-4">Registered Projects</h2>
                <div className="flex flex-col gap-3 text-left">
                    {projects.length > 0 ? (
                        projects.map(project => (
                            <div key={project.id} className="p-3 border rounded-md bg-gray-50">
                                <h3 className="font-bold text-lg">{project.name}</h3>
                                <p className="text-gray-600 break-all">{project.github_url}</p>
                            </div>
                        ))
                    ) : (
                        <p>No projects found. Register one!</p>
                    )}
                </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}