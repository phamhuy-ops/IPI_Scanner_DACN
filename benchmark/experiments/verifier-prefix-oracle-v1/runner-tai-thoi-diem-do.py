"""Cố định ngữ cảnh gold trong tiền tố JSON, chỉ sinh stance/lý do; diagnostic 6 nguồn."""
import hashlib
import json
import os
from pathlib import Path
import sys
import time
from verifier_data_loader import ROOT, load_role


def gold_prefix(target):
    value = json.dumps(target, ensure_ascii=False, separators=(',', ':'))
    marker = '"stance":'
    if value.count(marker) != 1:
        raise ValueError('Cần đúng một finding có stance cho đối chứng.')
    prefix = value[:value.index(marker) + len(marker)]
    if '"reason":' in prefix or any(f'"stance":"{s}"' in prefix for s in ['confirmed', 'dismissed', 'uncertain']):
        raise ValueError('Không được cấp sẵn stance/lý do.')
    return prefix


def main():
    import torch
    from transformers import AutoTokenizer, AutoModelForCausalLM, BitsAndBytesConfig
    from peft import PeftModel, prepare_model_for_kbit_training
    out = ROOT / 'benchmark/experiments/verifier-prefix-oracle-v1'
    if out.exists():
        raise ValueError('Không ghi đè đối chứng.')
    selected = json.loads((ROOT / 'benchmark/experiments/verifier-hf-base-screen-v1/ke-hoach-truoc-do.json').read_text(encoding='utf-8'))['selected_source_ids']
    requests = [r for r in load_role('dev') if r['source_record_id'] in selected and r['mode'] == 'whole_source']
    if len(requests) != 6:
        raise ValueError('Sai số mẫu.')
    prefixes = {r['id']: gold_prefix(r['target']) for r in requests}
    storage = Path(os.environ['IPI_TRAINING_ROOT']).resolve()
    candidate = json.loads((ROOT / 'benchmark/experiments/verifier-pilot-candidate-02/ket-qua.json').read_text(encoding='utf-8'))
    adapter = Path(candidate['adapter_path']).resolve()
    assets = json.loads((ROOT / 'benchmark/experiments/verifier-gpu-assets-v1/ket-qua.json').read_text(encoding='utf-8'))
    local = Path(assets['snapshot']).resolve()
    if storage.drive.lower() != 'e:' or not all(p.is_relative_to(storage) for p in [adapter, local]):
        raise ValueError('Weights ngoài E.')
    def verify():
        for name, expected in candidate['adapter_files_sha256'].items():
            if hashlib.sha256((adapter / name).read_bytes()).hexdigest() != expected:
                raise ValueError('Adapter đổi.')
    verify()
    out.mkdir()
    plan = {'scope': 'gold_assistant_prefix_diagnostic_only', 'requests': 6, 'candidate_mode': 'whole_source', 'adapter': 'candidate-02_on',
        'max_new_tokens': 256, 'seed': 42, 'provided_prefixes': prefixes,
        'code_sha256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest(), 'adapter_sha256': candidate['adapter_files_sha256'],
        'stop_rule': 'Chốt chẩn đoán sau 6 ca, không thêm thử prompt hoặc train tự động trong lượt này.',
        'limitations': ['Gold cấp sẵn ID, span và các trường ngữ cảnh trong assistant prefix; không được coi là khả năng nhận diện của Agent.',
          'Chỉ model sinh stance/lý do và đóng JSON; không so trực tiếp với 12 biểu diễn hai mode.',
          'Giữ nguyên gold cũ và parser; không sửa vf-002/vf-008. Không gọi probe hoặc train.']}
    (out / 'ke-hoach.json').write_text(json.dumps(plan, ensure_ascii=False, indent=2), encoding='utf-8')
    torch.manual_seed(42); torch.cuda.set_per_process_memory_fraction(.8)
    tokenizer = AutoTokenizer.from_pretrained(local, local_files_only=True, trust_remote_code=False)
    base = AutoModelForCausalLM.from_pretrained(local, local_files_only=True, trust_remote_code=False,
        quantization_config=BitsAndBytesConfig(load_in_4bit=True, bnb_4bit_quant_type='nf4', bnb_4bit_use_double_quant=True, bnb_4bit_compute_dtype=torch.float16),
        device_map={'': 0}, torch_dtype=torch.float16, attn_implementation='sdpa')
    base = prepare_model_for_kbit_training(base, use_gradient_checkpointing=False)
    model = PeftModel.from_pretrained(base, adapter, is_trainable=False, local_files_only=True)
    model.eval(); model.config.use_cache = True
    for p in model.parameters():
        p.requires_grad_(False)
    responses = []; started = time.perf_counter()
    for row in requests:
        began = time.perf_counter()
        prompt = tokenizer.apply_chat_template(row['payload']['messages'], tokenize=False, add_generation_prompt=True)
        prefix = prefixes[row['id']]
        ids = tokenizer(prompt + prefix, add_special_tokens=False, return_tensors='pt')['input_ids'].to('cuda')
        if ids.shape[-1] + 256 > model.config.max_position_embeddings:
            raise ValueError('Vượt context, không cắt.')
        with torch.inference_mode():
            generated = model.generate(ids, attention_mask=torch.ones_like(ids), do_sample=False, max_new_tokens=256,
                pad_token_id=tokenizer.pad_token_id, eos_token_id=tokenizer.eos_token_id)[0, ids.shape[-1]:]
        suffix = tokenizer.decode(generated, skip_special_tokens=True)
        responses.append({'id': row['id'], 'source_record_id': row['source_record_id'], 'mode': row['mode'], 'status': 'completed',
            'response': prefix + suffix, 'generated_suffix': suffix, 'input_tokens': ids.shape[-1], 'generated_tokens': len(generated),
            'hit_token_limit': len(generated) >= 256, 'seconds': time.perf_counter() - began})
        (out / 'phan-hoi.json').write_text(json.dumps(responses, ensure_ascii=False, indent=2), encoding='utf-8')
        print(json.dumps({'done': len(responses), 'total': 6}), flush=True)
    verify()
    result = {'requests': 6, 'seconds': time.perf_counter() - started, 'peak_vram_allocated': torch.cuda.max_memory_allocated(),
        'peak_vram_reserved': torch.cuda.max_memory_reserved(), 'trainable_parameters': sum(p.numel() for p in model.parameters() if p.requires_grad),
        'training_started': False, 'probe_used': False, 'runtime_changed': False, 'adapter_unchanged': True}
    (out / 'ket-qua.json').write_text(json.dumps(result, indent=2), encoding='utf-8')
    print(json.dumps(result))


if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8')
    main()
