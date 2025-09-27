# backend/check_models.py
import google.generativeai as genai
import os
from dotenv import load_dotenv

# .envファイルからAPIキーを読み込む
load_dotenv()
gemini_api_key = os.getenv("GEMINI_API_KEY")
if not gemini_api_key:
    print("エラー: GEMINI_API_KEYが.envファイルに設定されていません。")
else:
    genai.configure(api_key=gemini_api_key)
    print("利用可能なモデル:")
    for m in genai.list_models():
        # 私たちが使いたい'generateContent'メソッドをサポートしているモデルのみ表示
        if 'generateContent' in m.supported_generation_methods:
            print(m.name)