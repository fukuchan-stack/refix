import traceback
import os
import google.generativeai as genai
import openai
import anthropic
from dotenv import load_dotenv
import json
from typing import List, Dict, Any
import asyncio
import re

# .envファイルから環境変数を読み込む
load_dotenv()

# --- 各AIクライアントの初期化 (非同期) ---
try:
    gemini_api_key = os.getenv("GEMINI_API_KEY")
    if not gemini_api_key: raise ValueError("GEMINI_API_KEY not found.")
    genai.configure(api_key=gemini_api_key)
    
    openai_api_key = os.getenv("OPENAI_API_KEY")
    if not openai_api_key: raise ValueError("OPENAI_API_KEY not found.")
    openai_client = openai.AsyncOpenAI(api_key=openai_api_key)

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

# --- テストコード生成用の新しい関数 (多言語対応に修正) ---

async def generate_test_code(original_code: str, revised_code: str, language: str) -> str:

    print(f"--- DEBUG: Entering generate_test_code for language: {language} ---")



    is_ts_js = language.lower() in ["javascript", "typescript"]

    test_framework = "Jest" if is_ts_js else "pytest"

    prompt = ""



    # 言語に応じてプロンプトを動的に切り替える

    if is_ts_js:

        prompt = f"""

あなたは、コードの変更点を正確に検証するテストを作成する、熟練したTypeScript/Jestテストエンジニアです。

提供された「修正済みのコード」が正しく動作することを証明するためのユニットテストを、Jestフレームワークを使用して生成してください。



【実行環境に関する非常に重要なルール】

- 「修正済みのコード」は `main.ts` というファイルに保存されます。

- あなたがこれから生成するテストコードは `main.test.ts` という別のファイルに保存されます。

- そのため、テスト対象の関数やクラスを `main.ts` から **必ずインポートする必要があります**。

- 例: `import {{ functionNameToTest }} from './main';`



【テストコード生成ルール】

1. テストフレームワークは「Jest」を使用してください。

2. `main.ts` から必要な要素をインポートする `import` 文を必ず記述してください。

3. 「修正済みのコード」が「元のコード」のバグを修正していることを検証する、具体的で有用なアサーションを記述してください。

4. 出力には、テストコード本体（`import`文やテスト関数・クラス）のみを含めてください。他の説明やMarkdownの囲い(```)は絶対に含めないでください。



---

【元のコード（参考情報）】

```typescript

{original_code}

```

---

【修正済みのコード（main.tsの内容）】

```typescript

{revised_code}

```

---

上記のルールに厳密に従い、import文を含む完全なテストコードを生成してください。

"""

    else:  # Pythonの場合

        prompt = f"""

あなたは、コードの変更点を正確に検証するテストを作成する、熟練したPython/pytestテストエンジニアです。

提供された「修正済みのコード」が正しく動作することを証明するためのユニットテストを、pytestフレームワークを使用して生成してください。



【実行環境に関する非常に重要なルール】

あなたが生成するテストコードは、「修正済みのコード」と同じファイル、同じスコープに配置されてから実行されます。

そのため、テスト対象の関数やクラスをインポートする必要は一切ありません。そのまま直接呼び出してください。



【テストコード生成ルール】

- テストフレームワークは「pytest」を使用してください。

- 「修正済みのコード」が「元のコード」のバグを修正していることを検証する、具体的で有用なアサーションを記述してください。

- 出力には、テストコード本体（import文やテスト関数・クラス）のみを含めてください。他の説明やMarkdownの囲い(```)は絶対に含めないでください。



【元のコード（参考情報）】

```Python

{original_code}

```

---

【修正済みのコード（テスト対象）】

```python

{revised_code}

```

---

上記のルールに厳密に従い、テスト対象のインポート文は含めずに、テストコードを生成してください。

"""



    try:

        # テストコード生成は最も高性能なモデルで行うのが望ましい

        raw_response = await _call_gpt(prompt)

        print("--- DEBUG: Successfully received test code from GPT-4o. ---")



        # AIがプロンプトの指示を無視してMarkdownを付与した場合の、念のための除去処理

        match = re.search(r"```(?:\w+)?\n(.*?)\n```", raw_response, re.DOTALL)

        if match:

            return match.group(1).strip()

        return raw_response.strip()

    except Exception as e:

        print(f"--- DEBUG: An error occurred while generating test code: {e} ---")

        error_message = f"# テストコードの生成中にエラーが発生しました。\n# Error: {str(e)}"

        return error_message





# --- ▼▼▼ 対話（チャット）用の関数を新しいものに置き換え ▼▼▼ ---

async def continue_conversation(chat_history: List[Dict[str, str]]) -> str:
    """
    既存の会話履歴に基づき、AIとの対話を継続する。
    """
    print("--- DEBUG: Entering continue_conversation ---")

    system_prompt = """
    あなたは、シニア開発者としてコードレビューを行うAIアシスタント「Refix」です。
    あなたは既に最初のレビュー結果を提示済みです。
    ユーザーは、そのレビュー結果やコードについて追加の質問をしています。
    これまでの会話の文脈全体を踏まえ、ユーザーの質問に対して簡潔かつ的確に回答してください。
    """

    messages_for_api = [
        {
            'role': 'model' if msg.get('role') == 'assistant' else 'user',
            'parts': [msg.get('content', '')]
        }
        for msg in chat_history
    ]

    messages_for_api.insert(0, {'role': 'user', 'parts': [system_prompt]})
    messages_for_api.insert(1, {'role': 'model', 'parts': ["はい、承知いたしました。追加の質問について回答します。"]})

    try:
        model = genai.GenerativeModel('gemini-1.5-flash-latest')
        
        last_user_message_parts = messages_for_api.pop().get('parts', [''])
        last_user_message = last_user_message_parts[0] if last_user_message_parts else ''
        
        chat = model.start_chat(history=messages_for_api)
        
        print(f"--- DEBUG: Calling Gemini with history. Last question: {last_user_message[:100]}... ---")
        response = await chat.send_message_async(last_user_message)
        
        print("--- DEBUG: Successfully received response from Gemini in conversation. ---")
        return response.text

    except Exception as e:
        # 正しいインデントに修正済みのexceptブロック
        print("--- DEBUG: An unexpected error occurred in continue_conversation ---")
        traceback.print_exc()
        raise Exception(f"AIとの対話中にエラーが発生しました: {e}")




# --- ヘルパー関数（現在は直接は使われていないが、互換性のため残す） ---

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