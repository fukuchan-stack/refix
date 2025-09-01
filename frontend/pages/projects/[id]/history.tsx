// frontend/pages/projects/[id]/history.tsx

import { useRouter } from 'next/router';
import { useUser } from '@auth0/nextjs-auth0/client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Head from 'next/head';
import { ReviewDashboard } from '../../../components/ReviewDashboard';

// [id].tsxから型定義をコピー
interface ChatMessage { id: number; role: 'user' | 'assistant'; content: string; created_at: string; }
interface Review { id: number; code_snippet: string; review_content: string; created_at: string; chat_messages: ChatMessage[]; language?: string; }
interface Project { id: number; name: string; reviews: Review[]; }


const HistoryPage = () => {
    const router = useRouter();
    const { id } = router.query;
    const [project, setProject] = useState<Project | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const apiKey = process.env.NEXT_PUBLIC_INTERNAL_API_KEY;

    useEffect(() => {
        if (!id) return;
        const fetchProjectDetails = async () => {
            try {
                const res = await fetch(`/api/projects/${id}`, { headers: { 'X-API-Key': apiKey || '' } });
                if (res.ok) {
                    const data = await res.json();
                    setProject(data);
                } else {
                    setError('プロジェクトの履歴の取得に失敗しました。');
                }
            } catch (err) {
                setError('サーバーとの通信エラーです。');
            } finally {
                setIsLoading(false);
            }
        };
        fetchProjectDetails();
    }, [id, apiKey]);

    if (isLoading) return <div className="text-center p-10">読み込み中...</div>;
    if (error) return <div className="text-center p-10 text-red-500">{error}</div>;
    if (!project) return <div className="text-center p-10">プロジェクトが見つかりません。</div>;

    return (
        <>
            <Head>
                <title>{project.name} のレビュー履歴 - Refix</title>
            </Head>
            <main className="container mx-auto p-4 md:p-8">
                <div className="mb-6">
                    <Link href={`/projects/${id}`} legacyBehavior>
                        <a className="text-indigo-600 hover:text-indigo-800">&larr; AIチャットに戻る</a>
                    </Link>
                </div>
                <h1 className="text-3xl font-bold mb-6">レビュー履歴: {project.name}</h1>
                <div className="space-y-8">
                    {project.reviews && project.reviews.length > 0 ? (
                        [...project.reviews].reverse().map(review => (
                            <div key={review.id} className="bg-white shadow-lg rounded-lg p-1 border">
                                <ReviewDashboard review={review} />
                            </div>
                        ))
                    ) : (
                        <p>このプロジェクトにはまだレビュー履歴がありません。</p>
                    )}
                </div>
            </main>
        </>
    );
};

export default HistoryPage;