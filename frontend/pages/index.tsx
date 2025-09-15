import Link from 'next/link';
import Head from 'next/head';
import { ThemeSwitcher } from '../components/ThemeSwitcher';
import { useUser } from '@auth0/nextjs-auth0/client';
import { useRouter } from 'next/router'; // ★★★ 変更点①: useRouterを追加 ★★★
import { useEffect } from 'react';     // ★★★ 変更点②: useEffectを追加 ★★★

const LandingPage = () => {
    // ★★★ 変更点③: useUserからisLoadingを取得し、useRouterを呼び出す ★★★
    const { user, isLoading } = useUser();
    const router = useRouter();

    // ★★★ 変更点④: 認証状態をチェックし、リダイレクトを実行するロジックを追加 ★★★
    useEffect(() => {
        // Auth0のチェックが完了し、かつ、ユーザーがログイン済みの場合
        if (!isLoading && user) {
            // ダッシュボードページにリダイレクト
            router.push('/dashboard');
        }
    }, [isLoading, user, router]); // isLoadingかuserの状態が変わるたびにこの処理を実行


    // ★★★ 変更点⑤: 認証チェック中か、リダイレクト待ちの間はローディング画面を表示 ★★★
    // これにより、ログイン済みユーザーにトップページが一瞬表示されてしまうのを防ぎます。
    if (isLoading || user) {
        return (
            <div className="bg-white dark:bg-black min-h-screen flex items-center justify-center">
                <p className="text-gray-500 dark:text-gray-400">読み込み中...</p>
            </div>
        );
    }

    // 認証チェックが完了し、かつ未ログインの場合のみ、以下のトップページの内容を表示
    return (
        <div className="bg-white dark:bg-black min-h-screen flex flex-col text-gray-800 dark:text-gray-200">
            <Head>
                <title>Refix - AI-Powered Code Review Assistant</title>
                <meta name="description" content="Refixは、複数のAIによるクロスチェックで、あなたのコードの品質、パフォーマンス、セキュリティを客観的に評価する、次世代の開発パートナーです。" />
            </Head>

            {/* ヘッダー */}
            <header className="w-full">
                <div className="container mx-auto p-4 flex justify-between items-center">
                    <h1 className="text-2xl font-bold">Refix</h1>
                    <div className="flex items-center space-x-4">
                        <ThemeSwitcher />
                        {user ? (
                            <Link href="/dashboard" className="text-sm font-semibold bg-gray-100 dark:bg-gray-800 py-2 px-4 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700">
                                ダッシュボードへ
                            </Link>
                        ) : (
                            <Link href="/api/auth/login" className="text-sm font-semibold hover:text-blue-500">
                                ログイン
                            </Link>
                        )}
                    </div>
                </div>
            </header>

            {/* メインコンテンツ */}
            <main className="flex-1 flex items-center">
                <div className="container mx-auto px-4 text-center">
                    <h2 className="text-4xl md:text-6xl font-extrabold text-gray-900 dark:text-white leading-tight">
                        AIの力で、コードレビューを加速する。
                    </h2>
                    <p className="mt-4 max-w-2xl mx-auto text-lg text-gray-600 dark:text-gray-400">
                        Refixは、複数のAIによるクロスチェックで、あなたのコードの品質、パフォーマンス、セキュリティを客観的に評価する、次世代の開発パートナーです。
                    </p>
                    <div className="mt-10">
                        <Link href="/workbench" className="inline-block bg-blue-600 text-white font-bold text-lg py-4 px-10 rounded-lg hover:bg-blue-700 transition-transform transform hover:scale-105">
                            無料で試してみる
                        </Link>
                    </div>
                </div>
            </main>

            {/* フッター */}
            <footer className="w-full">
                <div className="container mx-auto p-4 text-center text-gray-500 text-sm">
                    &copy; 2025 Refix. All rights reserved.
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;