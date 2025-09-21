# backend/snyk_service.py

import os
import requests
from fastapi import HTTPException
import time # ▼▼▼ 処理を一時停止するためにtimeモジュールをインポートします ▼▼▼

SNYK_API_KEY = os.getenv("SNYK_API_KEY")
SNYK_API_V1_URL = "https://snyk.io/api/v1"

def scan_dependencies(file_content: str, language: str):
    """
    Snyk APIの応答をシミュレーションし、固定の脆弱性データを返します。
    """
    
    # ▼▼▼ ここからがシミュレーション用のコードです ▼▼▼

    # 1. リアルな偽の応答データ（モックデータ）を定義します。
    #    これは、以前テスト用に提示したrequirements.txtの内容に対応しています。
    mock_snyk_response = {
        "ok": False,
        "vulnerabilities": [
            {
                "id": "SNYK-PYTHON-PYYAML-590151",
                "title": "Arbitrary Code Execution",
                "severity": "high",
                "description": "A vulnerability in PyYAML allows for arbitrary code execution when loading untrusted YAML files. This can lead to a full system compromise.",
                "packageName": "PyYAML",
                "version": "5.0",
                "from": ["PyYAML@5.0"]
            },
            {
                "id": "SNYK-PYTHON-REQUESTS-1758529",
                "title": "Improper Certificate Validation",
                "severity": "medium",
                "description": "The requests library before 2.22.0 does not properly validate SSL certificates in some cases, which could allow a man-in-the-middle attacker to intercept traffic.",
                "packageName": "requests",
                "version": "2.19.0",
                "from": ["requests@2.19.0"]
            }
        ],
        "dependencyCount": 4,
        "packageManager": "pip"
    }

    # 2. 実際のAPI通信のように見せるため、2秒間だけ処理を止めます。
    print("--- SIMULATING SNYK API CALL ---")
    time.sleep(2)
    print("--- SIMULATION COMPLETE ---")

    # 3. 偽の応答データを返します。
    return mock_snyk_response

    # ▲▲▲ シミュレーションはここまでです ▲▲▲


    # --- 以下は、将来Snykの有料プランに加入した場合に使用する本物のコードです ---
    # --- 現在はコメントアウトして、実行されないようにしています ---
    #
    # if not SNYK_API_KEY:
    #     raise HTTPException(
    #         status_code=500,
    #         detail="Snyk API Key is not configured on the server."
    #     )
    #
    # endpoint_map = {
    #     'python': ('test/pip', 'requirements.txt'),
    #     'typescript': ('test/npm', 'package.json'),
    #     'javascript': ('test/npm', 'package.json'),
    # }
    #
    # if language not in endpoint_map:
    #     raise HTTPException(
    #         status_code=400,
    #         detail=f"Unsupported language for dependency scan: {language}"
    #     )
    #
    # api_path, file_name = endpoint_map[language]
    # full_api_url = f"{SNYK_API_V1_URL}/{api_path}"
    # 
    # headers = {
    #     "Authorization": f"token {SNYK_API_KEY}",
    # }
    #
    # payload = {
    #     "file": {
    #         "contents": file_content
    #     }
    # }
    # 
    # try:
    #     params = {'org': os.getenv("SNYK_ORG_ID")}
    #     response = requests.post(full_api_url, headers=headers, params=params, json=payload)
    #     response.raise_for_status()
    #     return response.json()
    #
    # except requests.exceptions.HTTPError as err:
    #     print(f"Snyk API Error: {err.response.status_code} - {err.response.text}")
    #     raise HTTPException(
    #         status_code=err.response.status_code,
    #         detail=f"Snyk API returned an error: {err.response.text}"
    #     )
    # except requests.exceptions.RequestException as err:
    #     print(f"Snyk Request Error: {err}")
    #     raise HTTPException(
    #         status_code=503,
    #         detail=f"Could not connect to Snyk API: {err}"
    #     )