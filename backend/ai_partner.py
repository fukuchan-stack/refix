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


def get_ai_review_for_files(files: dict[str, str], linter_results: str) -> dict:
    """
    与えられた複数ファイルとLinterの結果を基に、Geminiにレビューを依頼する関数。
    """
    print("--- DEBUG: Entering get_ai_review_for_files function. ---")
    try:
        model = genai.GenerativeModel('gemini-1.5-flash-latest')

        # 複数のファイルを見やすいように整形
        formatted_code = ""
        for filename, content in files.items():
            formatted_code += f"### ファイル名: {filename}\n"
            formatted_code += f"```\n{content}\n```\n\n"

        # プロンプトを更新し、Linterの結果をインプットに追加
        prompt = f"""
        あなたは経験豊富なソフトウェアエンジニアで、コードレビューの達人です。
        以下の複数のソースコードファイルをレビューしてください。

        参考情報として、静的解析ツール(Flake8)の実行結果を添付します。
        この結果も踏まえて、より高度な視点からレビューを行ってください。
        Flake8が検出した単純なスタイル違反（例：一行あたりの文字数超過）を、あなたが再度細かく指摘する必要はありません。
        Flake8の結果から推測できる、より根本的な問題（例：複雑すぎるコード、潜在的なバグ）に焦点を当ててください。

        --- Flake8解析結果 ---
        {linter_results}
        --------------------

        レビュー結果は、必ず以下のルールに従った有効なJSON形式で出力してください。
        
        【JSON出力ルール】
        - ルートオブジェクトは "overall_score" と "panels" という2つのキーを持つこと。
        - "overall_score": コード全体の健全性を0から100の整数で評価したスコア。
        - "panels": 指摘事項の配列。
        - 配列の各要素は、"category", "file_name", "line_number", "title", "details" の5つのキーを持つオブジェクトであること。
        - "category": 指摘のカテゴリ。必ず "Bug", "Security", "Performance", "Quality" のいずれかを選択すること。
        - "file_name": 指摘対象のファイル名。
        - "line_number": 指摘対象のおおよその行番号（整数）。
        - "title": 指摘内容の短い要約。
        - "details": 指摘内容の詳細な解説と、具体的な修正案。

        --- ソースコード ---
        {formatted_code}
        --------------------
        """

        response = model.generate_content(prompt)
        
        json_text = response.text.strip().replace("```json", "").replace("```", "").strip()
        
        print("--- DEBUG: Successfully received response from Gemini. ---")
        return json.loads(json_text)

    except Exception as e:
        print(f"--- DEBUG: An error occurred while generating AI review: {e} ---")
        return {
            "overall_score": 0,
            "panels": [{
                "category": "Error",
                "file_name": "N/A",
                "line_number": 0,
                "title": "AIレビュー生成エラー",
                "details": f"AIレビューの生成中にエラーが発生しました: {e}"
            }]
        }