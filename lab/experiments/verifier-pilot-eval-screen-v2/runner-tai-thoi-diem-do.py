"""So sánh adapter off/on trên cùng PEFT model, chỉ dev, không cập nhật trọng số."""
import contextlib
import hashlib
import json
import os
from pathlib import Path
import sys
import time
import traceback
from verifier_data_loader import ROOT, LOCK, load_role

ACTIVE_OUT = None


def journal(stage):
    if ACTIVE_OUT is not None:
        (ACTIVE_OUT / 'tien-do.json').write_text(json.dumps({'stage': stage, 'recorded_at_unix': time.time()}), encoding='utf-8')
    print(json.dumps({'stage': stage}), flush=True)


def main():
    global ACTIVE_OUT
    full = '--full' in sys.argv[1:]
    version = 'v2' if '--retry' in sys.argv[1:] else 'v1'
    out = ROOT / f'benchmark/experiments/verifier-pilot-eval-{"dev" if full else "screen"}-{version}'
    if out.exists():
        raise ValueError('Không ghi đè lượt đo.')
    dev = load_role('dev')
    selected = json.loads((ROOT / 'benchmark/experiments/verifier-hf-base-screen-v1/ke-hoach-truoc-do.json').read_text(encoding='utf-8'))['selected_source_ids']
    requests = dev if full else [r for r in dev if r['source_record_id'] in selected]
    result = json.loads((ROOT / 'benchmark/experiments/verifier-pilot-candidate-01/ket-qua.json').read_text(encoding='utf-8'))
    if result['status'] != 'trained_not_quality_validated' or result['global_steps'] != 45:
        raise ValueError('Adapter cuối epoch chưa hoàn tất.')
    adapter = Path(result['adapter_path'])
    for file, expected in result['adapter_files_sha256'].items():
        if hashlib.sha256((adapter / file).read_bytes()).hexdigest() != expected:
            raise ValueError('Adapter đã đổi.')
    out.mkdir()
    ACTIVE_OUT = out
    journal('verified_inputs')
    plan = {'scope': 'full_dev' if full else 'paired_small_dev_screen_not_full_dev',
        'request_ids': [r['id'] for r in requests], 'selected_source_ids': sorted({r['source_record_id'] for r in requests}),
        'seed': 42, 'max_new_tokens': 256, 'do_sample': False, 'model_modes': ['off', 'on'],
        'same_model_instance': True, 'same_kbit_preparation': True, 'checkpoint_selection': 'final_epoch_only',
        'screen_rule_before_outputs': 'Chỉ chạy full dev nếu on hợp lệ cả 12 request và không thêm FP/false-clear so với off; nếu không đạt thì giữ kết quả screen, không dùng probe.',
        'lock_sha256': hashlib.sha256(LOCK.read_bytes()).hexdigest(),
        'adapter_sha256': result['adapter_files_sha256'], 'code_sha256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest()}
    (out / 'ke-hoach-truoc-do.json').write_text(json.dumps(plan, ensure_ascii=False, indent=2), encoding='utf-8')
    import torch
    from transformers import AutoTokenizer, AutoModelForCausalLM, BitsAndBytesConfig
    from peft import PeftModel, prepare_model_for_kbit_training
    journal('libraries_loaded')
    torch.manual_seed(42)
    torch.cuda.set_per_process_memory_fraction(.8)
    assets = json.loads((ROOT / 'benchmark/experiments/verifier-gpu-assets-v1/ket-qua.json').read_text(encoding='utf-8'))
    local = Path(assets['snapshot']).resolve()
    if not local.is_relative_to(Path(os.environ['IPI_TRAINING_ROOT']).resolve()):
        raise ValueError('Weights ngoài E.')
    tokenizer = AutoTokenizer.from_pretrained(local, local_files_only=True, trust_remote_code=False)
    journal('tokenizer_loaded')
    base = AutoModelForCausalLM.from_pretrained(local, local_files_only=True, trust_remote_code=False,
        quantization_config=BitsAndBytesConfig(load_in_4bit=True, bnb_4bit_quant_type='nf4', bnb_4bit_use_double_quant=True,
            bnb_4bit_compute_dtype=torch.float16), device_map={'': 0}, torch_dtype=torch.float16, attn_implementation='sdpa')
    journal('base_loaded')
    base = prepare_model_for_kbit_training(base, use_gradient_checkpointing=False)
    journal('base_prepared')
    model = PeftModel.from_pretrained(base, adapter, is_trainable=False, local_files_only=True)
    journal('adapter_loaded')
    model.eval()
    model.config.use_cache = True
    for p in model.parameters():
        p.requires_grad_(False)
    started = time.perf_counter()
    for mode in ['off', 'on']:
        journal(f'evaluating_{mode}')
        folder = out / mode
        folder.mkdir()
        responses = []
        manager = model.disable_adapter() if mode == 'off' else contextlib.nullcontext()
        with manager:
            for row in requests:
                began = time.perf_counter()
                item = {'id': row['id'], 'source_record_id': row['source_record_id'], 'mode': row['mode']}
                try:
                    ids = tokenizer.apply_chat_template(row['payload']['messages'], tokenize=True, add_generation_prompt=True, return_tensors='pt').to('cuda')
                    if ids.shape[-1] + 256 > model.config.max_position_embeddings:
                        raise ValueError('Vượt context, không cắt input.')
                    with torch.inference_mode():
                        generated = model.generate(ids, attention_mask=torch.ones_like(ids), do_sample=False, max_new_tokens=256,
                            pad_token_id=tokenizer.pad_token_id, eos_token_id=tokenizer.eos_token_id)[0, ids.shape[-1]:]
                    item.update(status='completed', response=tokenizer.decode(generated, skip_special_tokens=True),
                        input_tokens=ids.shape[-1], generated_tokens=len(generated), hit_token_limit=len(generated) >= 256)
                except Exception as error:
                    item.update(status='error', error=str(error))
                item['seconds'] = time.perf_counter() - began
                responses.append(item)
                (folder / 'phan-hoi.json').write_text(json.dumps(responses, ensure_ascii=False, indent=2), encoding='utf-8')
                print(json.dumps({'adapter': mode, 'done': len(responses), 'total': len(requests), 'status': item['status']}), flush=True)
                if item['status'] == 'error':
                    raise RuntimeError(item['error'])
    summary = {'scope': plan['scope'], 'source_records': len(plan['selected_source_ids']), 'requests_per_mode': len(requests),
        'same_model_instance': True, 'adapter_off_on': True, 'seconds_total': time.perf_counter() - started,
        'peak_vram_allocated': torch.cuda.max_memory_allocated(), 'peak_vram_reserved': torch.cuda.max_memory_reserved(),
        'trainable_parameters': sum(p.numel() for p in model.parameters() if p.requires_grad),
        'training_started_during_eval': False, 'probe_used': False, 'runtime_changed': False}
    (out / 'ket-qua.json').write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding='utf-8')
    journal('completed')
    print(json.dumps(summary), flush=True)


if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')
    try:
        main()
    except BaseException as error:
        if ACTIVE_OUT is not None:
            (ACTIVE_OUT / 'loi.json').write_text(json.dumps({'type': type(error).__name__, 'error': str(error),
                'traceback': traceback.format_exc(), 'training_started_during_eval': False}, ensure_ascii=False, indent=2), encoding='utf-8')
        raise
