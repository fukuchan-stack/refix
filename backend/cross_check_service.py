# backend/cross_check_service.py

from collections import defaultdict
from typing import List, Dict, Any

def consolidate_reviews(raw_results: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    複数のAIからの生のレビュー結果を、問題点ごとに集約・整理する。
    """
    all_suggestions = []
    # 1. 全てのAIからの提案を一つのリストにフラット化する
    for result in raw_results:
        if result.get("review") and result["review"].get("details"):
            for detail in result["review"]["details"]:
                # 元のAIモデル名を各提案に追加しておく
                detail["model_name"] = result["model_name"]
                all_suggestions.append(detail)

    # 2. 行番号をキーとして提案をグルーピングする
    #    defaultdictを使うと、キーが存在しない場合に自動で空のリストを作成してくれる
    line_based_groups = defaultdict(list)
    for suggestion in all_suggestions:
        line_number = suggestion.get("line_number")
        if line_number:
            line_based_groups[line_number].append(suggestion)

    # 3. グループ化されたデータを、フロントエンドが使いやすい形式に整形する
    consolidated_issues = []
    for line_number, suggestions_on_line in line_based_groups.items():
        # 参加したAIのリストを作成（重複なし）
        participating_ais = sorted(list(set(s["model_name"] for s in suggestions_on_line)))
        
        # 代表的なカテゴリとタイトルを最初の提案から取得（簡易的な方法）
        # より高度にするなら、ここでカテゴリの多数決などを取ることも可能
        representative_category = suggestions_on_line[0].get("category", "General")
        representative_title = suggestions_on_line[0].get("description", "Issue")

        issue = {
            "issue_id": f"line_{line_number}_{representative_category.lower()}",
            "line_number": line_number,
            "category": representative_category,
            "title": representative_title,
            "participating_ais": participating_ais,
            "suggestions": suggestions_on_line, # 各AIの具体的な提案内容
        }
        consolidated_issues.append(issue)

    # 行番号順にソートして返す
    return sorted(consolidated_issues, key=lambda x: x["line_number"])