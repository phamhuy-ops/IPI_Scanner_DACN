"""Xác minh đường lưu và thử ghi file tạm do chính lệnh tạo, không xóa dữ liệu cũ."""
import datetime
import json
import os
import pathlib
import sys
import tempfile


def main():
    if not os.environ.get("IPI_TRAINING_ROOT"):
        raise RuntimeError("Hãy chạy bằng launcher Python huấn luyện để nạp đường lưu.")
    root = pathlib.Path(os.environ["IPI_TRAINING_ROOT"]).resolve()
    keys = ("HF_HOME", "HF_HUB_CACHE", "HF_DATASETS_CACHE", "HF_ASSETS_CACHE", "HF_XET_CACHE",
            "PIP_CACHE_DIR", "UV_CACHE_DIR", "UV_PYTHON_INSTALL_DIR", "TORCH_HOME", "TORCH_EXTENSIONS_DIR",
            "TRITON_CACHE_DIR", "PYTHONPYCACHEPREFIX", "IPI_WEIGHTS_DIR", "IPI_ADAPTERS_DIR", "IPI_CHECKPOINTS_DIR",
            "IPI_TRAINING_LOG_DIR", "IPI_TRAINING_RESULTS_DIR", "TEMP", "TMP")
    checks = []
    for key in keys:
        value = os.environ.get(key)
        if not value:
            raise RuntimeError(f"Thiếu đường lưu {key}")
        directory = pathlib.Path(value).resolve()
        if not directory.is_relative_to(root) or not directory.is_dir():
            raise RuntimeError(f"Đường lưu nằm ngoài root hoặc chưa tồn tại: {key}")
        descriptor, name = tempfile.mkstemp(prefix="ipi-storage-probe-", dir=directory)
        temporary_path = pathlib.Path(name).resolve()
        if not temporary_path.is_relative_to(root):
            os.close(descriptor)
            raise RuntimeError("File thử không nằm trong thư mục huấn luyện.")
        try:
            with os.fdopen(descriptor, "wb") as handle:
                handle.write(b"ipi-storage-probe\n")
            if temporary_path.read_bytes() != b"ipi-storage-probe\n":
                raise RuntimeError("Đọc lại file thử không khớp.")
        finally:
            # Chỉ bỏ file thử có tên do mkstemp trả về; không xóa thư mục hoặc file có sẵn.
            temporary_path.unlink()
        checks.append({"variable": key, "path": str(directory), "write_read_ok": True})
    paths = {"executable": str(pathlib.Path(sys.executable).resolve()), "base_prefix": str(pathlib.Path(sys.base_prefix).resolve()),
             "venv_prefix": str(pathlib.Path(sys.prefix).resolve()), "tempfile_directory": tempfile.gettempdir()}
    if not all(pathlib.Path(value).resolve().is_relative_to(root) for value in paths.values()):
        raise RuntimeError("Python gốc/venv hoặc tempfile vẫn ở ngoài root.")
    report = {"recorded_at": datetime.datetime.now(datetime.timezone.utc).isoformat(), "root": str(root),
              "python": sys.version, "paths": paths, "directories": checks, "cwd": os.getcwd(),
              "storage_checks_passed": True, "training_ready": False,
              "note": "Chỉ kiểm tra lưu trữ. Chưa cài thư viện ML hoặc chạy forward/backward; checkpoint/adapter output_dir của trainer tương lai vẫn phải đặt rõ theo cấu hình."}
    output = root / "logs" / "training-storage-check.json"
    output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    sys.stdout.reconfigure(encoding="utf-8")
    print(json.dumps({"output": str(output), **report}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
