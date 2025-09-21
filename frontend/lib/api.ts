// frontend/lib/api.ts

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

  // バックエンドの関数名が scan_dependencies になったので、ここも合わせます
  const response = await fetch(`${apiBaseUrl}/api/snyk/scan`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
    },
    // バックエンドは 'code' というキーでファイル内容を受け取るようにしたので、
    // ここでは fileContent を code というプロパティに詰めて送ります。
    body: JSON.stringify({ code: fileContent, language }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: 'Failed to scan with Snyk. The server returned an unreadable error.' }));
    throw new Error(errorData.detail || `An unknown error occurred (status: ${response.status}).`);
  }

  return response.json();
};