# Chạy Python riêng với cache/temp/output trên E; giữ nguyên thư mục code đang làm việc.
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'use-training-storage.ps1')
if (-not (Test-Path -LiteralPath $env:IPI_TRAINING_PYTHON)) {
    throw "Chưa có môi trường Python riêng tại $env:IPI_TRAINING_PYTHON. Xem hướng dẫn lưu trữ huấn luyện."
}
& $env:IPI_TRAINING_PYTHON @args
exit $LASTEXITCODE
