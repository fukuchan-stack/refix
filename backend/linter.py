# backend/linter.py
import subprocess
import tempfile
import os

def run_flake8_on_code(code: str) -> str:
    """
    与えられたPythonコード文字列に対してFlake8を実行し、その結果を文字列として返す。

    Args:
        code (str): チェック対象のPythonコード。

    Returns:
        str: Flake8からの指摘事項。指摘がない場合は成功メッセージを返す。
    """
    # Flake8はファイルに対して実行する必要があるため、一時ファイルを作成する
    # delete=Falseにすることで、withブロックを抜けた後もファイルパスを使い、手動で削除できる
    with tempfile.NamedTemporaryFile(mode='w+', suffix='.py', delete=False) as tmp_file:
        tmp_file.write(code)
        tmp_file_path = tmp_file.name

    print(f"--- DEBUG: Running Flake8 on temporary file: {tmp_file_path} ---")

    result_text = ""
    try:
        # Pythonのsubprocessモジュールを使い、コンテナ内でflake8コマンドを実行する
        process = subprocess.run(
            ['flake8', tmp_file_path],
            capture_output=True,  # 標準出力と標準エラーをキャプチャする
            text=True,            # 出力をテキストとして扱う
            check=False           # Flake8が何かを検出してもエラーでプログラムを止めない
        )

        if process.stdout:
            result_text = process.stdout
            print(f"--- DEBUG: Flake8 found issues:\n{result_text} ---")
        else:
            result_text = "Success: No issues found by Flake8."
            print("--- DEBUG: Flake8 found no issues. ---")

    except FileNotFoundError:
        # Dockerコンテナ内にflake8がインストールされていない場合など
        result_text = "Error: Flake8 command not found. Is it installed in the container?"
        print(f"--- DEBUG: ERROR - {result_text} ---")
    except Exception as e:
        result_text = f"Error: An unexpected error occurred while running Flake8: {e}"
        print(f"--- DEBUG: ERROR - {result_text} ---")
    finally:
        # 処理が終わったら、作成した一時ファイルを必ず削除する
        os.remove(tmp_file_path)

    return result_text