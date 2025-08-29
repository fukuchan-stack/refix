import os
import google.generativeai as genai
from dotenv import load_dotenv
import json

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


def get_ai_review_for_file(file_content: str) -> dict:
    """
    与えられたファイルの内容を基に、Geminiに構造化されたJSON形式でコードレビューを依頼する関数。
    """
    print("--- DEBUG: Entering get_ai_review_for_file function. ---")
    try:
        model = genai.GenerativeModel('gemini-1.5-flash-latest')

        # AIへの指示（プロンプト）をJSON出力を要求するように更新
        prompt = f"""
        あなたは経験豊富なソフトウェアエンジニアで、コードレビューの達人です。
        以下のソースコードをレビューしてください。

        レビュー結果は、必ず以下のルールに従った有効なJSON形式で出力してください。
        
        【JSON出力ルール】
        - ルートオブジェクトは "overall_score" と "panels" という2つのキーを持つこと。
        - "overall_score": コード全体の健全性を0から100の整数で評価したスコア。
        - "panels": 指摘事項の配列。
        - 配列の各要素は、"category", "title", "details" の3つのキーを持つオブジェクトであること。
        - "category": 指摘のカテゴリ。必ず "Bug", "Security", "Performance", "Quality" のいずれかを選択すること。
        - "title": 指摘内容の短い要約（例：「SQLインジェクションの脆弱性」）。
        - "details": 指摘内容の詳細な解説と、具体的な修正案。

        --- ソースコード ---
        {file_content}
        --------------------
        """

        response = model.generate_content(prompt)
        
        # Geminiの返答は ```json ... ``` のようにコードブロックで囲まれることがあるため、それを取り除く
        json_text = response.text.strip().replace("```json", "").replace("```", "").strip()
        
        print("--- DEBUG: Successfully received response from Gemini. ---")
        return json.loads(json_text)

    except Exception as e:
        print(f"--- DEBUG: An error occurred while generating AI review: {e} ---")
        # エラー時もルールに沿った形式で返す
        return {
            "overall_score": 0,
            "panels": [{
                "category": "Error",
                "title": "AIレビュー生成エラー",
                "details": f"AIレビューの生成中にエラーが発生しました: {e}"
            }]
        }