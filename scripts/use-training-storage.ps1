param([string]$Root = $(if ($env:IPI_TRAINING_ROOT) { $env:IPI_TRAINING_ROOT } else { 'E:\IPI-Training' }))

$ErrorActionPreference = 'Stop'
$trainingRoot = [IO.Path]::GetFullPath($Root).TrimEnd('\')
if ($trainingRoot -eq [IO.Path]::GetPathRoot($trainingRoot).TrimEnd('\')) {
    throw 'Cần thư mục riêng, không dùng gốc ổ đĩa làm nơi huấn luyện.'
}
if (-not (Test-Path -LiteralPath ([IO.Path]::GetPathRoot($trainingRoot)))) { throw 'Ổ lưu dữ liệu chưa sẵn sàng.' }
if ((Test-Path -LiteralPath $trainingRoot) -and ((Get-Item -LiteralPath $trainingRoot -Force).Attributes -band [IO.FileAttributes]::ReparsePoint)) {
    throw 'Thư mục huấn luyện là liên kết; cần kiểm tra đích thực trước khi dùng.'
}

# Chỉ đổi môi trường shell hiện tại; không sửa PATH, TEMP hoặc cache toàn hệ thống.
$paths = @{
    IPI_TRAINING_ROOT = $trainingRoot
    HF_HOME = Join-Path $trainingRoot 'cache\huggingface'
    HF_HUB_CACHE = Join-Path $trainingRoot 'cache\huggingface\hub'
    HF_DATASETS_CACHE = Join-Path $trainingRoot 'cache\huggingface\datasets'
    HF_ASSETS_CACHE = Join-Path $trainingRoot 'cache\huggingface\assets'
    HF_XET_CACHE = Join-Path $trainingRoot 'cache\huggingface\xet'
    PIP_CACHE_DIR = Join-Path $trainingRoot 'cache\pip'
    UV_CACHE_DIR = Join-Path $trainingRoot 'cache\uv'
    UV_PYTHON_INSTALL_DIR = Join-Path $trainingRoot 'python'
    UV_PYTHON_BIN_DIR = Join-Path $trainingRoot 'tools\python-bin'
    UV_TOOL_DIR = Join-Path $trainingRoot 'tools\uv-tools'
    UV_TOOL_BIN_DIR = Join-Path $trainingRoot 'tools\bin'
    TORCH_HOME = Join-Path $trainingRoot 'cache\torch'
    TORCH_EXTENSIONS_DIR = Join-Path $trainingRoot 'cache\torch-extensions'
    TRITON_CACHE_DIR = Join-Path $trainingRoot 'cache\triton'
    PYTHONPYCACHEPREFIX = Join-Path $trainingRoot 'cache\pycache'
    PYTHONUSERBASE = Join-Path $trainingRoot 'cache\python-user'
    IPI_WEIGHTS_DIR = Join-Path $trainingRoot 'weights'
    IPI_ADAPTERS_DIR = Join-Path $trainingRoot 'adapters'
    IPI_CHECKPOINTS_DIR = Join-Path $trainingRoot 'checkpoints'
    IPI_TRAINING_LOG_DIR = Join-Path $trainingRoot 'logs'
    IPI_TRAINING_RESULTS_DIR = Join-Path $trainingRoot 'results'
    TEMP = Join-Path $trainingRoot 'tmp'
    TMP = Join-Path $trainingRoot 'tmp'
}
foreach ($entry in $paths.GetEnumerator()) {
    $resolved = [IO.Path]::GetFullPath($entry.Value)
    if (($resolved -ne $trainingRoot) -and -not $resolved.StartsWith($trainingRoot + '\', [StringComparison]::OrdinalIgnoreCase)) {
        throw 'Đường lưu vượt khỏi thư mục huấn luyện.'
    }
    if (-not (Test-Path -LiteralPath $resolved)) { $null = New-Item -ItemType Directory -Path $resolved }
    if ((Get-Item -LiteralPath $resolved -Force).Attributes -band [IO.FileAttributes]::ReparsePoint) { throw "Đường lưu là liên kết: $resolved" }
    [Environment]::SetEnvironmentVariable($entry.Key, $resolved, 'Process')
}
$env:PYTHONNOUSERSITE = '1'
$env:PIP_REQUIRE_VIRTUALENV = 'true'
$env:IPI_TRAINING_PYTHON = Join-Path $trainingRoot 'venvs\verifier\Scripts\python.exe'
if (Test-Path -LiteralPath $env:IPI_TRAINING_PYTHON) {
    $env:VIRTUAL_ENV = Join-Path $trainingRoot 'venvs\verifier'
    $venvScripts = Join-Path $env:VIRTUAL_ENV 'Scripts'
    if (($env:PATH -split ';') -notcontains $venvScripts) { $env:PATH = $venvScripts + ';' + $env:PATH }
}
