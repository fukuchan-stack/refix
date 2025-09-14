import docker
import os
import asyncio
import shutil
import uuid
from pathlib import Path
import re # 正規表現を扱うために追加

# Dockerクライアントを初期化
try:
    client = docker.from_env()
except docker.errors.DockerException:
    print("Error: Docker daemon is not running or accessible.")
    client = None

# docker-compose.yml から渡された環境変数を読み取る
HOST_SHARED_DIR = os.getenv("HOST_PROJECT_PATH")
CONTAINER_SHARED_DIR = Path("/app")

def _sanitize_code(code: str) -> str:
    """AIが生成したMarkdownコードブロックを解除する"""
    # ```python ... ``` や ``` ... ``` のようなパターンにマッチ
    match = re.match(r"^```(?:\w+)?\n(.*?)\n```$", code, re.DOTALL | re.MULTILINE)
    if match:
        return match.group(1).strip()
    return code.strip()

async def run_code_in_sandbox(test_code: str, code_to_test: str) -> dict:
    if not client or not HOST_SHARED_DIR:
        error_msg = "Docker service is not configured correctly. HOST_PROJECT_PATH is not set."
        return {"status": "error", "output": error_msg}

    run_id = str(uuid.uuid4())
    run_dir_in_container = CONTAINER_SHARED_DIR / run_id
    
    try:
        os.makedirs(run_dir_in_container, exist_ok=True)
        
        # ★★★ ここが変更点：コードを書き込む前にサニタイズする ★★★
        clean_code_to_test = _sanitize_code(code_to_test)
        clean_test_code = _sanitize_code(test_code)
        
        combined_code = f"{clean_code_to_test}\n\n{clean_test_code}"
        (run_dir_in_container / "test_run.py").write_text(combined_code, encoding="utf-8")

        host_path_to_run_dir = os.path.join(HOST_SHARED_DIR, run_id)
        
        command = ["python", "-m", "pytest", "test_run.py", "-v"]

        container_output = await asyncio.to_thread(
            _run_docker_container, host_path_to_run_dir, command
        )
        
        output_str = container_output.decode('utf-8', errors='ignore')
        
        if "failed" in output_str or "ERRORS" in output_str:
            return {"status": "failed", "output": output_str}
        elif "passed" in output_str:
            return {"status": "success", "output": output_str}
        else:
            return {"status": "error", "output": f"テスト結果を判定できませんでした。\n\n{output_str}"}

    except docker.errors.ContainerError as e:
        full_output = f"コンテナがエラー終了しました (Exit Code: {e.exit_status})\n\n--- Container Logs ---\n{str(e)}"
        return {"status": "error", "output": full_output}
    except Exception as e:
        return {"status": "error", "output": str(e)}
    finally:
        if os.path.exists(run_dir_in_container):
            shutil.rmtree(run_dir_in_container)

def _run_docker_container(host_dir_path: str, command: list) -> bytes:
    return client.containers.run(
        "refix-sandbox-runner",
        command,
        volumes={host_dir_path: {'bind': '/app', 'mode': 'rw'}},
        working_dir="/app",
        remove=True,
        mem_limit="256m",
        cpu_shares=512,
        network_disabled=True,
    )