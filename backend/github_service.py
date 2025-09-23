# backend/github_service.py

import os
from github import Github, GithubException
from urllib.parse import urlparse

def get_repo_info_from_github(github_url: str):
    """
    GitHub URLからリポジトリの基本情報（説明、言語、スター数）を取得します。
    """
    try:
        github_pat = os.getenv("GITHUB_PAT")
        if not github_pat:
            print("--- DEBUG: WARNING - GITHUB_PAT is not set. Skipping GitHub API call. ---")
            return None
        
        g = Github(github_pat)
        path = urlparse(github_url).path.strip('/')
        repo = g.get_repo(path)
        
        return {
            "description": repo.description,
            "language": repo.language,
            "stars": repo.stargazers_count,
        }
    except GithubException as e:
        print(f"--- DEBUG: ERROR - Failed to fetch repo info from GitHub: {e} ---")
        return None