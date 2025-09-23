// --- 型定義 ---
interface ProjectData {
  name: string;
  github_url: string;
  user_id: string;
}

// --- 認証が必要なAPI呼び出し ---

export const getProjects = async (accessToken: string, userId: string, sortBy: string = 'newest') => {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  const response = await fetch(`${apiBaseUrl}/api/projects/?user_id=${userId}&sort_by=${sortBy}`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });
  if (!response.ok) throw new Error('Failed to fetch projects');
  return response.json();
};

export const getProjectById = async (accessToken: string, projectId: string) => {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  const response = await fetch(`${apiBaseUrl}/api/projects/${projectId}`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });
  if (!response.ok) throw new Error('Failed to fetch project details');
  return response.json();
};

export const createProject = async (accessToken: string, projectData: ProjectData) => {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  const response = await fetch(`${apiBaseUrl}/api/projects/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify(projectData),
  });
  if (!response.ok) throw new Error('Failed to register project');
  return response.json();
};

export const scanDependenciesWithSnyk = async (accessToken: string, fileContent: string, language: string) => {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  const response = await fetch(`${apiBaseUrl}/api/snyk/scan`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ code: fileContent, language }),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: 'Failed to scan with Snyk.' }));
    throw new Error(errorData.detail);
  }
  return response.json();
};

export const continueChat = async (accessToken: string, chatHistory: { role: string, content: string }[], projectId: number) => {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  const response = await fetch(`${apiBaseUrl}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ chat_history: chatHistory, project_id: projectId }),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: 'Failed to continue chat.' }));
    throw new Error(errorData.detail);
  }
  return response.json();
};


// --- 公開API（認証不要） ---

export const inspectCodeConsolidated = async (code: string, language: string) => {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  const response = await fetch(`${apiBaseUrl}/api/inspect/consolidated`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, language }),
  });
  if (!response.ok) throw new Error('Failed to get consolidated inspection.');
  return response.json();
};