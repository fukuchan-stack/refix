import docker
import os
import asyncio
import shutil
import uuid
from pathlib import Path
import tarfile
import io
import re

# Dockerクライアントを初期化
try:
    client = docker.from_env()
except docker.errors.DockerException:
    print("Error: Docker daemon is not running or accessible.")
    client = None

HOST_SHARED_DIR = os.getenv("HOST_PROJECT_PATH")
CONTAINER_SHARED_DIR = Path("/app")

def _sanitize_code(code: str) -> str:
    """AIが生成したMarkdownコードブロックを解除する"""
    code = code.strip()
    # ```python ... ``` や ``` ... ``` のようなパターンにマッチ
    match = re.match(r"^```(?:\w+)?\n(.*?)\n```$", code, re.DOTALL)
    if match:
        return match.group(1).strip()
    return code

async def run_code_in_sandbox(test_code: str, code_to_test: str) -> dict:
    if not client or not HOST_SHARED_DIR:
        error_msg = "Docker service is not configured correctly. HOST_PROJECT_PATH is not set."
        return {"status": "error", "output": error_msg}

    run_id = str(uuid.uuid4())
    run_dir_in_container = CONTAINER_SHARED_DIR / run_id
    
    try:
        os.makedirs(run_dir_in_container, exist_ok=True)
        
        clean_code_to_test = _sanitize_code(code_to_test)
        clean_test_code = _sanitize_code(test_code)
        
        combined_code = f"{clean_code_to_test}\n\n{clean_test_code}"
        (run_dir_in_container / "test_run.py").write_text(combined_code, encoding="utf-8")

        command = ["python", "-m", "pytest", "test_run.py", "-v"]

        result = await asyncio.to_thread(
            _run_container_with_copy, run_dir_in_container, command
        )

        output_str = result.get("output", "")
        
        if result["status"] == "error":
             return result
        elif "failed" in output_str or "ERRORS" in output_str:
            return {"status": "failed", "output": output_str}
        elif "passed" in output_str:
            return {"status": "success", "output": output_str}
        else:
            return {"status": "error", "output": f"テスト結果を判定できませんでした。\n\n{output_str}"}

    except Exception as e:
        return {"status": "error", "output": str(e)}
    finally:
        if os.path.exists(run_dir_in_container):
            shutil.rmtree(run_dir_in_container)

def _run_container_with_copy(run_dir: Path, command: list) -> dict:
    container = None
    try:
        container = client.containers.create(
            "refix-sandbox-runner",
            command,
            working_dir="/app",
            mem_limit="256m",
            cpu_shares=512,
            network_disabled=True,
        )

        tar_stream = io.BytesIO()
        with tarfile.open(fileobj=tar_stream, mode='w') as tar:
            for f in os.listdir(run_dir):
                tar.add(os.path.join(run_dir, f), arcname=f)
        
        tar_stream.seek(0)
        container.put_archive('/app', tar_stream)

        container.start()
        result = container.wait(timeout=60)
        exit_code = result.get("StatusCode", 1)
        logs = container.logs(stdout=True, stderr=True).decode('utf-8', errors='ignore')
        
        if exit_code == 0:
            return {"status": "success", "output": logs}
        else:
            return {"status": "error", "output": f"コンテナがエラー終了しました (Exit Code: {exit_code})\n\n--- Container Logs ---\n{logs}"}

    except Exception as e:
        return {"status": "error", "output": str(e)}
    finally:
        if container:
            try:
                container.remove(force=True)
            except docker.errors.NotFound:
                pass