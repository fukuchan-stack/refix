import os
import google.generativeai as genai
import openai
import anthropic
from dotenv import load_dotenv
import json
from typing import List, Dict, Any
import asyncio

# .envファイルから環境変数を読み込む
load_dotenv()

# --- 各AIクライアントの初期化 (非同期) ---
try:
    # Gemini
    gemini_api_key = os.getenv("GEMINI_API_KEY")
    if not gemini_api_key: raise ValueError("GEMINI_API_KEY not found.")
    genai.configure(api_key=gemini_api_key)
    
    # OpenAI (GPT)
    openai_api_key = os.getenv("OPENAI_API_KEY")
    if not openai_api_key: raise ValueError("OPENAI_API_KEY not found.")
    openai_client = openai.AsyncOpenAI(api_key=openai_api_key)

    # Anthropic (Claude)
    anthropic_api_key = os.getenv("ANTHROPIC_API_KEY")
    if not anthropic_api_key: raise ValueError("ANTHROPIC_API_KEY not found.")
    claude_client = anthropic.AsyncAnthropic(api_key=anthropic_api_key)

except Exception as e:
    print(f"--- DEBUG: Error configuring API Keys: {e} ---")

# --- 各AIモデルを呼び出すための内部関数 (非同期) ---

async def _call_gemini(prompt: str, model_name: str = 'gemini-1.5-flash-latest') -> str:
    print(f"--- DEBUG: Calling Gemini model: {model_name} ---")
    model = genai.GenerativeModel(model_name)
    response = await asyncio.to_thread(model.generate_content, prompt)
    return response.text

async def _call_gpt(prompt: str, model_name: str = 'gpt-4o') -> str:
    print(f"--- DEBUG: Calling OpenAI model: {model_name} ---")
    response = await openai_client.chat.completions.create(
        model=model_name,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.1,
    )
    return response.choices[0].message.content

async def _call_claude(prompt: str, model_name: str = 'claude-3-5-sonnet-20240620') -> str:
    print(f"--- DEBUG: Calling Anthropic model: {model_name} ---")
    response = await claude_client.messages.create(
        model=model_name,
        max_tokens=4096,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.1,
    )
    return response.content[0].text

# --- 司令塔となるメインのレビュー生成関数 (非同期) ---

async def generate_structured_review(files: dict[str, str], linter_results: str, mode: str) -> dict:
    print(f"--- DEBUG: Entering generate_structured_review with mode: {mode} ---")

    if mode == 'fast_check':
        model_function = _call_claude
        model_name = 'claude-3-5-sonnet-20240620'
    elif mode == 'strict_audit':
        model_function = _call_gpt
        model_name = 'gpt-4o'
    else: # default is 'balanced'
        model_function = _call_gemini
        model_name = 'gemini-1.5-flash-latest'

    formatted_code = "".join([f"### ファイル名: {name}\n```\n{content}\n```\n\n" for name, content in files.items()])

    prompt = f"""
    あなたは経験豊富なソフトウェアエンジニアで、コードレビューの達人です。
    以下のソースコードファイルをレビューしてください。

    レビュー結果は、必ず以下のルールに従った有効なJSON形式で出力してください。
    
    【JSON出力ルール】
    - ルートオブジェクトは "overall_score", "summary", "details" という3つのキーを持つこと。
    - "overall_score": コード全体の健全性を0から100の整数で評価したスコア。
    - "summary": レビュー結果全体の短い要約（日本語で2文程度）。
    - "details": 指摘事項の配列。指摘がない場合は空の配列 [] とすること。
    - 配列の各要素は、"category", "file_name", "line_number", "description", "suggestion" の5つのキーを持つオブジェクトであること。
    - "category": 指摘のカテゴリ。必ず "Bug", "Security", "Performance", "Quality", "Readability", "Style" のいずれかから選択すること。
    - "file_name": 指摘対象のファイル名。
    - "line_number": 指摘対象のおおよその行番号（整数）。
    - "description": 指摘内容の詳細な解説（日本語）。
    - "suggestion": 提案を適用した後の、**ファイル全体の完全なコード**をコードブロックで出力すること。元のコードから変更がない場合でも、必ずファイル全体のコードを出力すること。

    --- ソースコード ---
    {formatted_code}
    --------------------
    """
    
    try:
        raw_response = await model_function(prompt, model_name)
        json_start = raw_response.find('{')
        json_end = raw_response.rfind('}') + 1
        if json_start == -1 or json_end == 0:
            raise json.JSONDecodeError("No JSON object found in the response", raw_response, 0)
        
        json_text = raw_response[json_start:json_end]
        print(f"--- DEBUG: Successfully received response from {model_name}. ---")
        return json.loads(json_text)
    except Exception as e:
        print(f"--- DEBUG: An error occurred while generating AI review with {model_name}: {e} ---")
        error_payload = {
            "overall_score": 0, 
            "summary": "AI review generation failed.",
            "details": [{
                "category": "Error", 
                "file_name": "N/A", 
                "line_number": 0, 
                "description": f"An error occurred during the review with {model_name}: {str(e)}",
                "suggestion": ""
            }]
        }
        return error_payload

# --- テストコード生成用の新しい関数 ---

async def generate_test_code(original_code: str, revised_code: str, language: str) -> str:
    """
    元のコードと修正案を基に、変更点を検証するユニットテストを生成する。
    """
    print(f"--- DEBUG: Entering generate_test_code for language: {language} ---")

    test_framework = "pytest" if language.lower() == "python" else "Jest"

    prompt = f"""
あなたは、コードの変更点を正確に検証するテストを作成する、熟練したテストエンジニアです。
提供された「元のコード」と「修正済みのコード」を比較し、「修正済みのコード」が正しく動作することを証明するためのユニットテストを1つだけ、{language}言語で生成してください。

【最重要ルール】
1. 生成するテストは、「元のコード」で実行すると失敗(fail)し、「修正済みのコード」で実行すると成功(pass)する必要があります。
2. テストは自己完結型にしてください。外部ファイル、ネットワークアクセスなどを必要としない、シンプルなユニットテストを作成してください。
3. テストフレームワークは「{test_framework}」を使用してください。
4. 出力には、テストコード本体のみを含めてください。他の余計な説明、前置き、解説、Markdownのコードブロック囲い(```)は一切不要です。

---
【元のコード】
{original_code}

---
【修正済みのコード】
{revised_code}

---

上記ルールに従い、テストコードを生成してください。
"""

    try:
        generated_test = await _call_gpt(prompt)
        print("--- DEBUG: Successfully received test code from GPT-4o. ---")
        return generated_test.strip()
    except Exception as e:
        print(f"--- DEBUG: An error occurred while generating test code: {e} ---")
        error_message = f"# テストコードの生成中にエラーが発生しました。\n# Error: {str(e)}"
        return error_message

# --- 対話(チャット)用の関数 ---
def continue_chat_with_ai(chat_history: list, user_message: str, original_review_context: str) -> str:
    """
    既存のチャット履歴と元のレビュー内容を基に、対話を続ける関数。
    """
    print("--- DEBUG: Entering continue_chat_with_ai function. ---")
    try:
        model = genai.GenerativeModel('gemini-1.5-flash-latest')
        
        formatted_history = []
        for msg in chat_history:
            role = 'model' if msg.role == 'assistant' else 'user'
            formatted_history.append({'role': role, 'parts': [msg.content]})

        chat_session = model.start_chat(history=formatted_history)
        
        response = chat_session.send_message(user_message)
        
        print("--- DEBUG: Successfully received chat response from Gemini. ---")
        return response.text
    except Exception as e:
        print(f"--- DEBUG: An error occurred during AI chat: {e} ---")
        return f"AIとの対話中にエラーが発生しました: {e}"

# このヘルパー関数は現在直接は使われていないが、互換性のため残す
def get_model_and_client_from_mode(mode: str) -> (str, Any):
    model_name = get_model_name_from_mode(mode)
    if "gemini" in model_name:
        return model_name, genai
    elif "claude" in model_name:
        return model_name, claude_client
    elif "gpt" in model_name:
        return model_name, openai_client
    return model_name, genai

def get_model_name_from_mode(mode: str) -> str:
    if mode == "balanced":
        return "gemini-1.5-flash-latest"
    elif mode == "fast_check":
        return "claude-3-5-sonnet-20240620"
    elif mode == "strict_audit":
        return "gpt-4o"
    return "gemini-1.5-flash-latest"