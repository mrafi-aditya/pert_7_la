from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from flask import Flask, jsonify, render_template, request

app = Flask(__name__)
BASE_DIR = Path(__file__).resolve().parent
SCORE_FILE = BASE_DIR / "scores.json"


def load_scores() -> list[dict[str, Any]]:
    if not SCORE_FILE.exists():
        return []
    try:
        data = json.loads(SCORE_FILE.read_text(encoding="utf-8"))
        if isinstance(data, list):
            return data
    except json.JSONDecodeError:
        pass
    return []


def save_scores(scores: list[dict[str, Any]]) -> None:
    SCORE_FILE.write_text(json.dumps(scores, ensure_ascii=False, indent=2), encoding="utf-8")


@app.get("/")
def index():
    return render_template("index.html")


@app.get("/api/scores")
def get_scores():
    scores = sorted(load_scores(), key=lambda item: item.get("score", 0), reverse=True)[:10]
    return jsonify(scores)


@app.post("/api/scores")
def post_score():
    payload = request.get_json(silent=True) or {}
    name = str(payload.get("name", "Anonim")).strip()[:16] or "Anonim"

    try:
        score = int(payload.get("score", 0))
    except (TypeError, ValueError):
        score = 0

    try:
        bugs = int(payload.get("bugs", 0))
        seconds = int(payload.get("seconds", 0))
    except (TypeError, ValueError):
        bugs = 0
        seconds = 0

    score = max(0, min(score, 999999))
    entry = {
        "name": name,
        "score": score,
        "bugs": max(0, bugs),
        "seconds": max(0, seconds),
    }

    scores = load_scores()
    scores.append(entry)
    scores = sorted(scores, key=lambda item: item.get("score", 0), reverse=True)[:10]
    save_scores(scores)
    return jsonify({"ok": True, "scores": scores}), 201


if __name__ == "__main__":
    app.run(debug=True)
