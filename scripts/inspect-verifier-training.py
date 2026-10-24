"""Kiểm tra chỉ đọc môi trường hiện tại; không cài thư viện hoặc nạp model."""
import ctypes
import datetime
import importlib.metadata
import json
import os
import pathlib
import platform
import shutil
import subprocess
import sys
import tempfile

ROOT = pathlib.Path(__file__).resolve().parent.parent
PACKAGES = ("torch", "transformers", "peft", "trl", "accelerate", "bitsandbytes", "datasets", "huggingface-hub", "safetensors")
DISK_BUDGET_GIB = 12


def command(args):
    try:
        result = subprocess.run(args, capture_output=True, timeout=10,
                                creationflags=subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0)
        def decode(value):
            return value.decode("utf-16-le" if b"\x00" in value else "utf-8", errors="replace").strip("\ufeff\r\n ")
        return {"returncode": result.returncode, "stdout": decode(result.stdout)[:4000], "stderr": decode(result.stderr)[:4000]}
    except (OSError, subprocess.TimeoutExpired) as error:
        return {"returncode": None, "stdout": "", "stderr": str(error)}


def windows_memory():
    if os.name != "nt":
        return None
    class Status(ctypes.Structure):
        _fields_ = [("length", ctypes.c_ulong), ("load", ctypes.c_ulong)] + [
            (name, ctypes.c_ulonglong) for name in ("total_phys", "available_phys", "total_page", "available_page", "total_virtual", "available_virtual", "available_extended")]
    status = Status()
    status.length = ctypes.sizeof(status)
    if not ctypes.windll.kernel32.GlobalMemoryStatusEx(ctypes.byref(status)):
        return None
    return {"total_bytes": status.total_phys, "available_bytes": status.available_phys}


def assess_inventory(inventory):
    missing = [name for name in PACKAGES if inventory["packages"].get(name) is None]
    free = inventory.get("disk", {}).get("free_bytes")
    return {
        "missing_packages_in_active_python": missing,
        "disk_budget_gib": DISK_BUDGET_GIB,
        "disk_budget_met": None if free is None else free >= DISK_BUDGET_GIB * 1024 ** 3,
        "disk_budget_note": "Ngân sách thực hành do dự án đặt, không phải mức tối thiểu được nhà cung cấp chứng nhận; phải đo lại theo đường lưu cache/checkpoint thực tế.",
        "cuda_training_compatible": None,
        "forward_backward_smoke_passed": None,
        "training_ready": False,
        "reason": "Đây là inventory, chưa cài môi trường, nạp weights, chạy backward hoặc đo peak bộ nhớ. Không suy khả năng train từ nvidia-smi.",
    }


def main():
    versions = {}
    for name in PACKAGES:
        try:
            versions[name] = importlib.metadata.version(name)
        except importlib.metadata.PackageNotFoundError:
            versions[name] = None
    storage_root = pathlib.Path(os.environ.get("IPI_TRAINING_ROOT", str(ROOT)))
    disk = shutil.disk_usage(storage_root)
    project_disk = shutil.disk_usage(ROOT)
    inventory = {"recorded_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
                 "python": sys.version, "executable": sys.executable, "platform": platform.platform(),
                 "packages": versions, "disk": {"path": str(storage_root), "total_bytes": disk.total, "free_bytes": disk.free},
                 "project_disk": {"path": str(ROOT), "total_bytes": project_disk.total, "free_bytes": project_disk.free},
                 "training_paths": {key: os.environ.get(key) for key in ("IPI_TRAINING_ROOT", "HF_HOME", "HF_HUB_CACHE", "HF_DATASETS_CACHE", "PIP_CACHE_DIR", "UV_CACHE_DIR", "UV_PYTHON_INSTALL_DIR", "IPI_WEIGHTS_DIR", "IPI_ADAPTERS_DIR", "IPI_CHECKPOINTS_DIR", "TEMP", "TMP")},
                 "system_memory": windows_memory(),
                 "gpu_query": command(["nvidia-smi", "--query-gpu=name,memory.total,memory.free,driver_version", "--format=csv,noheader"]),
                 "wsl_inventory": command(["wsl.exe", "--list", "--quiet"]) if os.name == "nt" else None,
                 "scope": "Chỉ Python đang chạy; không tìm toàn bộ venv hoặc import torch để khởi tạo GPU. WSL lỗi/không có output không chứng minh môi trường Linux sẵn sàng."}
    report = {"inventory": inventory, "assessment": assess_inventory(inventory)}
    results = ROOT / "benchmark" / "results"
    results.mkdir(parents=True, exist_ok=True)
    output = pathlib.Path(tempfile.mkdtemp(prefix="training-readiness-", dir=results))
    (output / "summary.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    print(json.dumps({"output": str(output.relative_to(ROOT)), **report}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
