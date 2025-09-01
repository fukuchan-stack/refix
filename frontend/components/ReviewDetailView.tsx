// frontend/components/ReviewDetailView.tsx

import React from 'react';
import { ReviewDashboard } from './ReviewDashboard';

// (型定義は[id].tsxと共通)
interface ChatMessage { id: number; role: 'user' | 'assistant'; content: string; created_at: string; }
interface Review { id: number; code_snippet: string; review_content: string; created_at: string; chat_messages: ChatMessage[]; language?: string; }

interface ReviewDetailViewProps {
  review: Review;
}

export const ReviewDetailView: React.FC<ReviewDetailViewProps> = ({ review }) => {
  return (
    <div className="bg-white shadow-lg rounded-lg p-6">
      <h2 className="text-2xl font-bold mb-4">AI Review Details</h2>
      <p className="text-sm text-gray-500 mb-4">
        Review generated on: {new Date(review.created_at).toLocaleString('ja-JP')}
      </p>
      <ReviewDashboard review={review} />
    </div>
  );
};