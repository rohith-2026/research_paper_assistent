import os
import uuid
from fastapi import UploadFile


def save_upload(file: UploadFile, upload_dir: str) -> str:
    os.makedirs(upload_dir, exist_ok=True)

    ext = os.path.splitext(file.filename or "")[1].lower()
    fname = f"{uuid.uuid4().hex}{ext}"
    path = os.path.join(upload_dir, fname)

    with open(path, "wb") as f:
        f.write(file.file.read())

    return path
