# backend/auth.py

import os
import requests
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError

# .envからAuth0の情報を読み込む
AUTH0_DOMAIN = os.getenv("AUTH0_DOMAIN")
AUTH0_API_AUDIENCE = os.getenv("AUTH0_API_AUDIENCE")
ALGORITHMS = ["RS256"]

# トークンを検証するためのクラス
class AuthVerifier:
    def __init__(self):
        # Auth0から公開鍵を取得してキャッシュする
        jwks_url = f"https://{AUTH0_DOMAIN}/.well-known/jwks.json"
        self.jwks = requests.get(jwks_url).json()

    # FastAPIのDependsに渡すための呼び出し可能なインスタンス
    def __call__(self, token: str = Depends(OAuth2PasswordBearer(tokenUrl="token"))):
        try:
            # 1. トークンのヘッダーから公開鍵ID (kid) を取得
            unverified_header = jwt.get_unverified_header(token)
            rsa_key = {}
            for key in self.jwks["keys"]:
                if key["kid"] == unverified_header["kid"]:
                    rsa_key = {
                        "kty": key["kty"],
                        "kid": key["kid"],
                        "use": key["use"],
                        "n": key["n"],
                        "e": key["e"]
                    }
            if not rsa_key:
                raise HTTPException(status_code=401, detail="Unable to find appropriate key")

            # 2. 公開鍵を使ってトークンをデコード・検証
            payload = jwt.decode(
                token,
                rsa_key,
                algorithms=ALGORITHMS,
                audience=AUTH0_API_AUDIENCE,
                issuer=f"https://{AUTH0_DOMAIN}/"
            )
            return payload

        except JWTError as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Invalid token: {e}",
                headers={"WWW-Authenticate": "Bearer"},
            )
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Authentication error: {e}")

# シングルトンインスタンスを作成
auth_verifier = AuthVerifier()