"""Đo QLoRA với fixture kỹ thuật mới, không cập nhật model bằng dữ liệu dev."""
import argparse
import hashlib
import importlib.metadata
import json
import os
from pathlib import Path
import sys
import time
from audit_verifier_tokenizer import MODEL, REVISION, completion_example
from verifier_collator import CompletionCollator

ROOT = Path(__file__).resolve().parents[1]


def fixture(tokenizer, length):
    messages = [{'role': 'system', 'content': 'Technical resource test. Return JSON.'},
                {'role': 'user', 'content': 'Synthetic resource fixture.'}]
    target = '{"assessments":[],"discoveries":[]}'
    ids, labels, boundary, _ = completion_example(tokenizer, messages, target)
    text = tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
    prefix = text[:text.index('Synthetic resource fixture.')]
    point = len(tokenizer.encode(prefix, add_special_tokens=False))
    filler = tokenizer.encode(' item', add_special_tokens=False)
    assert tokenizer.decode(ids[:point]) == prefix and len(filler) == 1
    count = length - len(ids)
    assert count >= 0
    ids = ids[:point] + filler * count + ids[point:]
    labels = labels[:point] + [-100] * count + labels[point:]
    assert len(ids) == length and all(v == -100 for v in labels[:boundary + count])
    assert tokenizer.decode([v for v in labels if v != -100]) == target + tokenizer.eos_token
    return {'input_ids': ids, 'labels': labels}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--length', type=int, choices=[1024, 1536, 2048], required=True)
    parser.add_argument('--steps', type=int, choices=[1, 10], default=1)
    parser.add_argument('--version', choices=['v1', 'v2', 'v3'], default='v1')
    args = parser.parse_args()
    output = ROOT / f'benchmark/experiments/verifier-gpu-{args.length}-{args.steps}-{args.version}'
    if output.exists():
        raise ValueError('Không ghi đè phép đo cũ.')
    output.mkdir(parents=True)
    result = {'model': MODEL, 'revision': REVISION, 'sequence_tokens': args.length,
        'steps_requested': args.steps, 'steps': [], 'fixture': 'fresh_synthetic_resource_only',
        'dev_or_holdout_used_for_updates': False, 'pilot_training_started': False,
        'training_ready': False, 'runtime_changed': False, 'save_reload_verified': False,
        'config': {'nf4': True, 'double_quant': True, 'dtype': 'float16', 'lora_r': 8,
                   'lora_alpha': 16, 'target_modules': ['q_proj', 'v_proj'], 'micro_batch_size': 1,
                   'gradient_checkpointing': True, 'use_reentrant': False, 'attention': 'sdpa',
                   'optimizer': 'AdamW', 'learning_rate': 0.0001, 'seed': 42, 'cpu_offload': False}}
    try:
        import torch
        import psutil
        from transformers import AutoTokenizer, AutoModelForCausalLM, BitsAndBytesConfig
        from peft import LoraConfig, PeftModel, get_peft_model, get_peft_model_state_dict, prepare_model_for_kbit_training
        if not torch.cuda.is_available():
            raise RuntimeError('CUDA không khả dụng, không tự chạy CPU.')
        storage = Path(os.environ['IPI_TRAINING_ROOT']).resolve()
        if storage.drive.lower() != 'e:':
            raise ValueError('Adapter/cache phải ở E.')
        assets = json.loads((ROOT / 'benchmark/experiments/verifier-gpu-assets-v1/ket-qua.json').read_text(encoding='utf-8'))
        assert assets['revision'] == REVISION
        local = assets['snapshot']
        result['versions'] = {name: importlib.metadata.version(name) for name in ['torch', 'transformers', 'peft', 'bitsandbytes', 'accelerate']}
        result['gpu'] = {'name': torch.cuda.get_device_name(0), 'capability': torch.cuda.get_device_capability(0),
                         'total_bytes': torch.cuda.get_device_properties(0).total_memory,
                         'free_before_load': torch.cuda.mem_get_info()[0]}
        torch.manual_seed(42)
        tokenizer = AutoTokenizer.from_pretrained(local, local_files_only=True, trust_remote_code=False)
        sample = fixture(tokenizer, args.length)
        result['fixture_sha256'] = hashlib.sha256(json.dumps(sample).encode()).hexdigest()
        started = time.perf_counter()
        model = AutoModelForCausalLM.from_pretrained(local, local_files_only=True, trust_remote_code=False,
            quantization_config=BitsAndBytesConfig(load_in_4bit=True, bnb_4bit_quant_type='nf4',
                bnb_4bit_use_double_quant=True, bnb_4bit_compute_dtype=torch.float16),
            device_map={'': 0}, torch_dtype=torch.float16, attn_implementation='sdpa')
        model.config.use_cache = False
        model = prepare_model_for_kbit_training(model, use_gradient_checkpointing=True,
                                                gradient_checkpointing_kwargs={'use_reentrant': False})
        model = get_peft_model(model, LoraConfig(r=8, lora_alpha=16, lora_dropout=0.05,
            target_modules=['q_proj', 'v_proj'], bias='none', task_type='CAUSAL_LM'))
        result['load_seconds'] = time.perf_counter() - started
        parameters = [p for p in model.parameters() if p.requires_grad]
        assert all('lora_' in n for n, p in model.named_parameters() if p.requires_grad)
        result['trainable_parameters'] = sum(p.numel() for p in parameters)
        result['device_map'] = {k: str(v) for k, v in model.hf_device_map.items()}
        assert all(v in ['0', 'cuda:0'] for v in result['device_map'].values())
        batch = {k: v.cuda() for k, v in CompletionCollator(tokenizer.pad_token_id, args.length)([sample]).items()}
        result['supervised_tokens'] = int((batch['labels'] != -100).sum())
        optimizer = torch.optim.AdamW(parameters, lr=0.0001)
        scaler = torch.amp.GradScaler('cuda', init_scale=1024)
        result['config']['grad_scaler_initial_scale'] = 1024
        model.train()
        torch.cuda.reset_peak_memory_stats()
        for index in range(args.steps):
            optimizer.zero_grad(set_to_none=True)
            torch.cuda.synchronize()
            started = time.perf_counter()
            with torch.autocast('cuda', dtype=torch.float16):
                loss = model(**batch).loss
            result['last_loss_before_backward'] = float(loss.detach())
            assert torch.isfinite(loss), 'Loss không hữu hạn trước backward.'
            scaler.scale(loss).backward()
            scaler.unscale_(optimizer)
            assert all(torch.isfinite(p.grad).all() for p in parameters if p.grad is not None), 'Gradient không hữu hạn sau unscale.'
            norm = torch.nn.utils.clip_grad_norm_(parameters, 1.0)
            scaler.step(optimizer)
            scaler.update()
            torch.cuda.synchronize()
            result['steps'].append({'step': index + 1, 'loss': float(loss.detach()), 'grad_norm': float(norm), 'seconds': time.perf_counter() - started})
            print(json.dumps(result['steps'][-1]), flush=True)
            del loss
        result['peak_torch_allocated_bytes'] = torch.cuda.max_memory_allocated()
        result['peak_torch_reserved_bytes'] = torch.cuda.max_memory_reserved()
        result['free_after_steps'] = torch.cuda.mem_get_info()[0]
        result['process_memory'] = psutil.Process().memory_info()._asdict()
        adapter = storage / 'checkpoints' / f'technical-only-{args.length}-{args.steps}-v1'
        if adapter.exists():
            raise ValueError('Không ghi đè adapter kỹ thuật.')
        before = {k: v.detach().cpu().clone() for k, v in get_peft_model_state_dict(model).items()}
        model.save_pretrained(adapter, safe_serialization=True)
        (adapter / 'KHONG-DUNG-TRIEN-KHAI.json').write_text('{"technical_fixture_only":true}', encoding='utf-8')
        base = model.unload()
        model = PeftModel.from_pretrained(base, adapter, is_trainable=False, local_files_only=True)
        after = get_peft_model_state_dict(model)
        assert set(before) == set(after) and all(torch.equal(v, after[k].detach().cpu()) for k, v in before.items())
        result.update(save_reload_verified=True, adapter_path=str(adapter), status='passed_technical_only')
    except Exception as error:
        result.update(status='failed', error_type=type(error).__name__, error=str(error))
        import traceback
        result['traceback'] = traceback.format_exc()
        if 'torch' in locals() and torch.cuda.is_available():
            result['peak_torch_allocated_bytes'] = torch.cuda.max_memory_allocated()
            result['peak_torch_reserved_bytes'] = torch.cuda.max_memory_reserved()
    finally:
        result['code_sha256'] = {name: hashlib.sha256((ROOT / 'scripts' / name).read_bytes()).hexdigest()
                               for name in ['smoke_verifier_gpu.py', 'verifier_collator.py', 'audit_verifier_tokenizer.py']}
        result['limitations'] = ['Chỉ fixture kỹ thuật, không đo nhận diện IPI hoặc độ ổn định train dài.',
            'Peak PyTorch không phải peak toàn GPU, không bao gồm mọi ứng dụng/driver.']
        (output / 'ket-qua.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
        print(json.dumps({k: result.get(k) for k in ['status', 'sequence_tokens', 'peak_torch_allocated_bytes', 'error']}, ensure_ascii=False), flush=True)
    return 0 if result['status'] == 'passed_technical_only' else 1


if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8')
    raise SystemExit(main())
