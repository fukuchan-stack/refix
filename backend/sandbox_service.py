import docker
import os
import asyncio
import shutil
import uuid
from pathlib import Path
import tarfile
import io
import re
from typing import List, Dict

try:
    client = docker.from_env(timeout=120)
except docker.errors.DockerException:
    print("Error: Docker daemon is not running or accessible.")
    client = None

def _sanitize_code(code: str) -> str:
    code = code.strip()
    match = re.match(r"^```(?:\w+)?\n(.*?)\n```$", code, re.DOTALL)
    if match:
        return match.group(1).strip()
    return code

async def run_code_in_sandbox(test_code: str, code_to_test: str, language: str) -> dict:
    run_id = str(uuid.uuid4())
    temp_run_dir = Path("/tmp/refix_runs") / run_id

    try:
        temp_run_dir.mkdir(parents=True, exist_ok=True)
        
        clean_code_to_test = _sanitize_code(code_to_test)
        clean_test_code = _sanitize_code(test_code)
        
        image_name: str
        command: List[str]
        
        if language.lower() in ["javascript", "typescript"]:
            image_name = "refix-ts-runner"
            command = ["npx", "jest", "main.test.ts", "--colors"]
            
            # ▼▼▼ ここから最後の修正 ▼▼▼
            # AIが生成したコードがモジュールとして扱われるように、先頭に"export"を自動で追加する
            module_code_to_test = f"export {clean_code_to_test}"
            (temp_run_dir / "main.ts").write_text(module_code_to_test, encoding="utf-8")
            # ▲▲▲ ここまで最後の修正 ▲▲▲
            (temp_run_dir / "main.test.ts").write_text(clean_test_code, encoding="utf-8")

        else: # Default to Python
            image_name = "refix-sandbox-runner"
            combined_code = f"{clean_code_to_test}\n\n{clean_test_code}"
            (temp_run_dir / "test_run.py").write_text(combined_code, encoding="utf-8")
            command = ["python", "-m", "pytest", "test_run.py", "-v"]

        result = await asyncio.to_thread(
            _run_container_with_copy, temp_run_dir, command, image_name
        )

        output_str = result.get("output", "")
        if result["status"] == "error":
            return result

        ansi_escape = re.compile(r'\x1B(?:[@-Z\\-_]|\[[0?]*[ -/]*[@-~])')
        clean_output = ansi_escape.sub('', output_str)

        if "failed" in clean_output.lower() or "fail" in clean_output.lower() or "test failed" in clean_output.lower():
            return {"status": "failed", "output": output_str}
        elif "passed" in clean_output.lower() or "pass" in clean_output.lower() or "test passed" in clean_output.lower():
            return {"status": "success", "output": output_str}
        else:
            return {"status": "error", "output": f"テスト結果を判定できませんでした。\n\n{output_str}"}
            
    except Exception as e:
        return {"status": "error", "output": str(e)}
    finally:
        if temp_run_dir.exists():
            shutil.rmtree(temp_run_dir)

def _run_container_with_copy(run_dir: Path, command: list, image_name: str) -> dict:
    container = None
    try:
        container = client.containers.create(
            image_name,
            command,
            working_dir="/app",
            mem_limit="512m",
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
        result = container.wait(timeout=100)
        exit_code = result.get("StatusCode", 1)
        
        logs = container.logs(stdout=True, stderr=True).decode('utf-8', errors='ignore')
        
        if exit_code == 0 and "failed" not in logs.lower() and "fail" not in logs.lower():
             return {"status": "success", "output": logs}
        else:
             # テスト失敗(failed)もコンテナとしてはエラー終了(exit code 1)なので、ステータスを分ける
             if "failed" in logs.lower() or "fail" in logs.lower():
                return {"status": "failed", "output": logs}
             else:
                return {"status": "error", "output": f"コンテナがエラー終了しました (Exit Code: {exit_code})\n\n--- Container Logs ---\n{logs}"}

    except docker.errors.ContainerError as e:
        logs = e.container.logs(stdout=True, stderr=True).decode('utf-8', errors='ignore')
        return {"status": "error", "output": f"コンテナ内でエラーが発生しました (Exit Code: {e.exit_status})\n\n--- Container Logs ---\n{logs}"}
    except Exception as e:
        return {"status": "error", "output": str(e)}
    finally:
        if container:
            try:
                container.remove(force=True)
            except docker.errors.NotFound:
                pass