import os
import google.generativeai as genai
import openai
import anthropic
from dotenv import load_dotenv
import json
from typing import List, Dict

# .envファイルから環境変数を読み込む
load_dotenv()

# --- 各AIクライアントの初期化 ---
try:
    # Gemini
    gemini_api_key = os.getenv("GEMINI_API_KEY")
    if not gemini_api_key: raise ValueError("GEMINI_API_KEY not found.")
    genai.configure(api_key=gemini_api_key)
    print("--- DEBUG: Gemini API Key configured. ---")
    
    # OpenAI (GPT)
    openai_api_key = os.getenv("OPENAI_API_KEY")
    if not openai_api_key: raise ValueError("OPENAI_API_KEY not found.")
    openai_client = openai.OpenAI(api_key=openai_api_key)
    print("--- DEBUG: OpenAI API Key configured. ---")

    # Anthropic (Claude)
    anthropic_api_key = os.getenv("ANTHROPIC_API_KEY")
    if not anthropic_api_key: raise ValueError("ANTHROPIC_API_KEY not found.")
    claude_client = anthropic.Anthropic(api_key=anthropic_api_key)
    print("--- DEBUG: Anthropic API Key configured. ---")

except Exception as e:
    print(f"--- DEBUG: Error configuring API Keys: {e} ---")

# --- 各AIモデルを呼び出すための内部関数 ---

def _call_gemini(prompt: str, model_name: str = 'gemini-1.5-flash-latest') -> str:
    print(f"--- DEBUG: Calling Gemini model: {model_name} ---")
    model = genai.GenerativeModel(model_name)
    response = model.generate_content(prompt)
    return response.text

def _call_gpt(prompt: str, model_name: str = 'gpt-4o') -> str:
    print(f"--- DEBUG: Calling OpenAI model: {model_name} ---")
    response = openai_client.chat.completions.create(
        model=model_name,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.1,
    )
    return response.choices[0].message.content

def _call_claude(prompt: str, model_name: str = 'claude-3-5-sonnet-20240620') -> str:
    print(f"--- DEBUG: Calling Anthropic model: {model_name} ---")
    response = claude_client.messages.create(
        model=model_name,
        max_tokens=4096,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.1,
    )
    return response.content[0].text

# --- 司令塔となるメインのレビュー生成関数 ---

def generate_structured_review(files: dict[str, str], linter_results: str, mode: str) -> dict:
    """
    モードに応じて最適なAIモデルを選択し、構造化されたレビューを生成する。
    """
    print(f"--- DEBUG: Entering generate_structured_review with mode: {mode} ---")

    # モードに応じてモデルと呼び出し関数を選択
    if mode == 'fast_check':
        model_function = _call_claude
        model_name = 'claude-3-5-sonnet-20240620'
    elif mode == 'strict_audit':
        model_function = _call_gpt
        model_name = 'gpt-4o'
    else: # デフォルトは 'balanced'
        model_function = _call_gemini
        model_name = 'gemini-1.5-flash-latest'

    # 複数のファイルを見やすいように整形
    formatted_code = "".join([f"### ファイル名: {name}\n```\n{content}\n```\n\n" for name, content in files.items()])

    # プロンプト (内容はこれまでと同じ)
    prompt = f"""
    あなたは経験豊富なソフトウェアエンジニアで、コードレビューの達人です。
    以下のソースコードファイルをレビューしてください。

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
    
    try:
        raw_response = model_function(prompt, model_name)
        json_text = raw_response.strip().replace("```json", "").replace("```", "").strip()
        print(f"--- DEBUG: Successfully received response from {model_name}. ---")
        return json.loads(json_text)
    except Exception as e:
        print(f"--- DEBUG: An error occurred while generating AI review with {model_name}: {e} ---")
        return {"overall_score": 0, "panels": [{"category": "Error", "file_name": "N/A", "line_number": 0, "title": "AIレビュー生成エラー", "details": f"AI({model_name})レビュー中にエラー: {e}"}]}

# --- 対話(チャット)用の関数 ---
# (注意：この関数は、今回の修正ではまだGemini専用のままです。まずメインのレビュー機能を完成させましょう)
def continue_chat_with_ai(chat_history: list, user_message: str, original_review_context: str) -> str:
    """
    既存のチャット履歴と元のレビュー内容を基に、対話を続ける関数。
    """
    print("--- DEBUG: Entering continue_chat_with_ai function. ---")
    try:
        model = genai.GenerativeModel('gemini-1.5-flash-latest')
        formatted_history = [{'role': 'model' if msg.role == 'assistant' else 'user', 'parts': [msg.content]} for msg in chat_history]
        system_prompt = f"""
        あなたは、すでに行われたコードレビューの結果について、ユーザーからの質問に答えるAIメンターです。
        以下のレビュー内容に関する対話であることを常に意識してください。
        --- 元のレビュー内容 ---
        {original_review_context}
        -----------------------
        """
        initial_user_prompt = f"""
        {system_prompt}
        --- ユーザーからの最初の質問 ---
        {formatted_history[0]['parts'][0] if formatted_history else user_message}
        """
        if formatted_history:
            formatted_history[0]['parts'][0] = initial_user_prompt
        chat_session = model.start_chat(history=formatted_history[:-1] if formatted_history else [])
        message_to_send = formatted_history[-1]['parts'][0] if formatted_history else initial_user_prompt
        response = chat_session.send_message(message_to_send)
        print("--- DEBUG: Successfully received chat response from Gemini. ---")
        return response.text
    except Exception as e:
        print(f"--- DEBUG: An error occurred during AI chat: {e} ---")
        return f"AIとの対話中にエラーが発生しました: {e}"