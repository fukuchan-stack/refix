# backend/ai_partner.py
import os
import google.generativeai as genai
from dotenv import load_dotenv

# .envファイルから環境変数を読み込む
load_dotenv()

# APIキーを設定
try:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY not found in environment variables.")
    genai.configure(api_key=api_key)
    print("--- DEBUG: Gemini API Key configured successfully. ---")
except Exception as e:
    print(f"--- DEBUG: Error configuring Gemini API Key: {e} ---")


def get_ai_review_for_file(file_content: str) -> str:
    """
    与えられたファイルの内容を基に、Geminiにコードレビューを依頼する関数。

    Args:
        file_content (str): レビューしてほしいファイルの中身。

    Returns:
        str: AIからのレビューコメント。エラー時はエラーメッセージを返す。
    """
    print("--- DEBUG: Entering get_ai_review_for_file function. ---")
    try:
        # 使用するモデルを選択
        model = genai.GenerativeModel('gemini-1.5-flash-latest')

        # AIへの指示（プロンプト）を作成
        prompt = f"""
        あなたは経験豊富なソフトウェアエンジニアで、コードレビューの達人です。
        以下のソースコードをレビューし、改善点や良い点について、具体的で建設的なフィードバックを日本語で提供してください。

        --- ソースコード ---
        {file_content}
        --------------------

        レビュー:
        """

        # AIにレビューを生成させる
        response = model.generate_content(prompt)

        print("--- DEBUG: Successfully received response from Gemini. ---")
        return response.text

    except Exception as e:
        print(f"--- DEBUG: An error occurred while generating AI review: {e} ---")
        return f"AIレビューの生成中にエラーが発生しました: {e}"