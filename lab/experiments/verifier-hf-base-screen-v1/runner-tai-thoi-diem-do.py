"""Đo chẩn đoán nhỏ trên dev trước baseline đầy đủ; không cập nhật trọng số."""
import hashlib
import json
import os
from pathlib import Path
import time

from verifier_data_loader import ROOT, LOCK, load_role


def main():
    out = ROOT / 'benchmark/experiments/verifier-hf-base-screen-v1'
    if out.exists():
        raise ValueError('Không ghi đè lượt đo.')
    dev = load_role('dev')
    records = [json.loads(line) for line in (ROOT / 'benchmark/data/annotations/verifier-local-release-preview-v2/mau-cho-duyet.jsonl').read_text(encoding='utf-8').splitlines()]
    selected = []
    for language in ['vi', 'en']:
        for stance in ['confirmed', 'dismissed', 'uncertain']:
            match = next(r for r in records if r['planned_role'] == 'dev' and r['language'] == language and r['annotation']['stance'] == stance)
            selected.append(match['id'])
    requests = [row for row in dev if row['source_record_id'] in selected]
    if len(requests) != 12:
        raise ValueError('Sai phạm vi sáu nguồn/hai mode.')
    protocol = json.loads(LOCK.read_text(encoding='utf-8'))
    assets = json.loads((ROOT / 'benchmark/experiments/verifier-gpu-assets-v1/ket-qua.json').read_text(encoding='utf-8'))
    storage = Path(os.environ['IPI_TRAINING_ROOT']).resolve()
    local = Path(assets['snapshot']).resolve()
    if storage.drive.lower() != 'e:' or not local.is_relative_to(storage) or assets['revision'] != protocol['revision']:
        raise ValueError('Sai weights/storage đã khóa.')
    out.mkdir()
    plan = {'scope': 'dev_screen_only_not_full_baseline', 'selected_source_ids': selected,
            'request_ids': [r['id'] for r in requests], 'seed': 42, 'max_new_tokens': 256,
            'selection': 'Mẫu dev đầu tiên của mỗi stance/ngôn ngữ, không chọn theo output.',
            'lock_sha256': hashlib.sha256(LOCK.read_bytes()).hexdigest(),
            'script_sha256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest()}
    (out / 'ke-hoach-truoc-do.json').write_text(json.dumps(plan, ensure_ascii=False, indent=2), encoding='utf-8')
    import torch
    import psutil
    from transformers import AutoTokenizer, AutoModelForCausalLM, BitsAndBytesConfig
    if not torch.cuda.is_available():
        raise RuntimeError('CUDA không khả dụng; không tự đổi backend.')
    torch.manual_seed(42)
    torch.cuda.set_per_process_memory_fraction(.8)
    started = time.perf_counter()
    tokenizer = AutoTokenizer.from_pretrained(local, local_files_only=True, trust_remote_code=False)
    model = AutoModelForCausalLM.from_pretrained(local, local_files_only=True, trust_remote_code=False,
        quantization_config=BitsAndBytesConfig(load_in_4bit=True, bnb_4bit_quant_type='nf4',
            bnb_4bit_use_double_quant=True, bnb_4bit_compute_dtype=torch.float16),
        device_map={'': 0}, torch_dtype=torch.float16, attn_implementation='sdpa')
    model.eval()
    for p in model.parameters():
        p.requires_grad_(False)
    results = []
    for row in requests:
        began = time.perf_counter()
        item = {'id': row['id'], 'source_record_id': row['source_record_id'], 'mode': row['mode']}
        try:
            ids = tokenizer.apply_chat_template(row['payload']['messages'], tokenize=True, add_generation_prompt=True, return_tensors='pt').to('cuda')
            if ids.shape[-1] + 256 > model.config.max_position_embeddings:
                raise ValueError('Vượt context; không cắt input.')
            with torch.inference_mode():
                output = model.generate(ids, attention_mask=torch.ones_like(ids), do_sample=False,
                    max_new_tokens=256, pad_token_id=tokenizer.pad_token_id, eos_token_id=tokenizer.eos_token_id)
            generated = output[0, ids.shape[-1]:]
            item.update({'response': tokenizer.decode(generated, skip_special_tokens=True), 'input_tokens': ids.shape[-1],
                         'generated_tokens': len(generated), 'hit_token_limit': len(generated) >= 256,
                         'status': 'completed'})
        except Exception as error:
            item.update({'status': 'error', 'error': str(error)})
        item['seconds'] = time.perf_counter() - began
        results.append(item)
        (out / 'phan-hoi.json').write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding='utf-8')
        print(json.dumps({'done': len(results), 'total': 12, 'status': item['status'], 'seconds': round(item['seconds'], 2)}), flush=True)
        if item['status'] == 'error':
            break
    result = {'scope': 'dev_screen_only_not_full_baseline', 'requests_planned': 12, 'requests_completed': len(results),
              'seconds_total': time.perf_counter() - started, 'peak_vram_allocated': torch.cuda.max_memory_allocated(),
              'peak_vram_reserved': torch.cuda.max_memory_reserved(), 'rss_bytes': psutil.Process().memory_info().rss,
              'gpu': torch.cuda.get_device_name(0), 'adapter_loaded': False, 'model_training_mode': model.training,
              'trainable_parameters': sum(p.numel() for p in model.parameters() if p.requires_grad),
              'training_started': False, 'probe_read_for_inference': False,
              'schema_transport': 'HF generate dùng messages, không giả vờ response_format được backend cưỡng chế.',
              'limitations': ['Sáu nguồn dev chẩn đoán, chưa đủ baseline đầy đủ hoặc kiểm chứng độc lập.',
                              'Không dùng kết quả để âm thầm đổi prompt/schema/ngưỡng trong bản khóa.']}
    (out / 'ket-qua.json').write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps(result), flush=True)


if __name__ == '__main__':
    main()
