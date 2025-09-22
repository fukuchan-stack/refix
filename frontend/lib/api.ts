/**
 * Snykを使用して依存関係ファイルの脆弱性をスキャンします。
 * @param fileContent requirements.txt や package.json の内容
 * @param language 'python', 'typescript', 'javascript' のいずれか
 * @returns Snykからのスキャン結果
 */
export const scanDependenciesWithSnyk = async (fileContent: string, language: string) => {
  const apiKey = process.env.NEXT_PUBLIC_INTERNAL_API_KEY;
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

  if (!apiKey) {
    console.error("Internal API key is not defined.");
    throw new Error("API configuration error. Please contact support.");
  }
  if (!apiBaseUrl) {
    console.error("API base URL is not defined.");
    throw new Error("API configuration error. Please contact support.");
  }

  const response = await fetch(`${apiBaseUrl}/api/snyk/scan`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
    },
    body: JSON.stringify({ code: fileContent, language }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: 'Failed to scan with Snyk. The server returned an unreadable error.' }));
    throw new Error(errorData.detail || `An unknown error occurred (status: ${response.status}).`);
  }

  return response.json();
};

/**
 * 複数のAIレビューを集約・統合した結果を取得します。
 * @param code スキャン対象のコード
 * @param language コードの言語
 * @returns 集約された指摘事項のリスト
 */
export const inspectCodeConsolidated = async (code: string, language: string) => {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

  if (!apiBaseUrl) {
    console.error("API base URL is not defined.");
    throw new Error("API configuration error. Please contact support.");
  }

  const response = await fetch(`${apiBaseUrl}/api/inspect/consolidated`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ code, language }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: 'Failed to get consolidated inspection.' }));
    throw new Error(errorData.detail || `An unknown error occurred (status: ${response.status}).`);
  }

  return response.json();
};

/**
 * AIとのチャットを継続します。
 * @param chatHistory これまでの会話履歴
 * @returns AIからの新しい応答
 */
export const continueChat = async (chatHistory: { role: string, content: string }[]) => {
  const apiKey = process.env.NEXT_PUBLIC_INTERNAL_API_KEY;
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

  if (!apiKey || !apiBaseUrl) {
    throw new Error("API configuration error.");
  }

  const response = await fetch(`${apiBaseUrl}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
    },
    body: JSON.stringify({ chat_history: chatHistory }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: 'Failed to continue chat.' }));
    throw new Error(errorData.detail || `An unknown error occurred (status: ${response.status}).`);
  }

  return response.json();
};