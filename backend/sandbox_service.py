import docker
import tempfile
import os
import asyncio
from pathlib import Path

# Dockerクライアントを初期化
# Docker for Windows/Mac/Linuxがローカルで実行されている必要があります
try:
    client = docker.from_env()
except docker.errors.DockerException:
    print("Error: Docker daemon is not running or accessible.")
    client = None

async def run_code_in_sandbox(test_code: str, code_to_test: str) -> dict:
    """
    受け取ったコードをDockerコンテナ内の安全なサンドボックス環境で実行する。
    pytestを使ってテストを実行し、その結果を返す。
    """
    if not client:
        return {"status": "error", "output": "Docker daemon is not available."}

    # 一時的なディレクトリを作成し、その中で作業する
    # これにより、ファイル名が衝突せず、後片付けも簡単になる
    with tempfile.TemporaryDirectory() as temp_dir:
        temp_path = Path(temp_dir)
        
        # テスト対象のコードとテストコードをファイルに書き出す
        code_file_path = temp_path / "code_to_test.py"
        test_file_path = temp_path / "test_run.py"

        with open(code_file_path, "w", encoding="utf-8") as f:
            f.write(code_to_test)

        with open(test_file_path, "w", encoding="utf-8") as f:
            f.write("from code_to_test import *\n") # テスト対象の関数などをインポート
            f.write(test_code)

        # Dockerコンテナ内で実行するコマンド
        # pytestを実行し、成功/失敗の情報を取得する
        command = ["pytest", "test_run.py"]

        try:
            # 同期的なDocker SDKの呼び出しを非同期に実行する
            # これにより、FastAPIのイベントループをブロックしない
            container_output = await asyncio.to_thread(
                _run_docker_container, temp_dir, command
            )
            
            # コンテナの出力（バイト列）を文字列に変換
            output_str = container_output.decode('utf-8', errors='ignore')
            
            # pytestの出力から成功か失敗かを判定
            if "failed" in output_str or "error" in output_str:
                return {"status": "failed", "output": output_str}
            elif "passed" in output_str:
                return {"status": "success", "output": output_str}
            else:
                return {"status": "error", "output": f"Could not determine test result.\n{output_str}"}

        except docker.errors.ContainerError as e:
            # コンテナが0以外のステータスコードで終了した場合（例：文法エラーなど）
            return {"status": "error", "output": e.stderr.decode('utf-8', errors='ignore')}
        except Exception as e:
            # その他の予期せぬエラー
            return {"status": "error", "output": str(e)}

def _run_docker_container(temp_dir: str, command: list) -> bytes:
    """
    Dockerコンテナを実行するためのヘルパー関数（同期処理）。
    asyncio.to_threadで呼び出されることを想定。
    """
    return client.containers.run(
        "python:3.11-slim-bookworm",  # 軽量な公式Pythonイメージを使用
        command,
        volumes={os.path.abspath(temp_dir): {'bind': '/app', 'mode': 'ro'}}, # ディレクトリを読み取り専用でマウント
        working_dir="/app",
        remove=True,  # 実行後にコンテナを自動で削除
        mem_limit="256m", # メモリ使用量を制限
        cpu_shares=512, # CPU使用率を相対的に制限 (デフォルトは1024)
        network_disabled=True, # コンテナ内からネットワークアクセスを禁止
    )