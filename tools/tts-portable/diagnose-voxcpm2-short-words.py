"""Compare short-word prompts for VoxCPM2; keep as a reusable quality check."""

from pathlib import Path

import soundfile as sf
from voxcpm import VoxCPM


def main() -> None:
    model = VoxCPM.from_pretrained(
        "D:/HuggingFaceCache/VoxCPM2", load_denoiser=False, local_files_only=True
    )
    cases = [
        ("are-short-prompt", "(warm clear female teacher voice)are"),
        ("are-period", "(warm clear female teacher voice)Are."),
        ("are-no-prompt", "Are."),
        ("come-short-prompt", "(warm clear female teacher voice)come"),
        ("come-period", "(warm clear female teacher voice)Come."),
        ("come-no-prompt", "Come."),
        ("do-period", "(warm clear female teacher voice)Do."),
    ]
    output_dir = Path("output/research/20260823-preschool-voxcpm-001/short-word-check")
    output_dir.mkdir(parents=True, exist_ok=True)
    for name, text in cases:
        wav = model.generate(
            text=text,
            cfg_value=2.0,
            inference_timesteps=10,
            max_len=40,
            retry_badcase_ratio_threshold=4.0,
        )
        sf.write(output_dir / f"{name}.wav", wav, model.tts_model.sample_rate)
        print(f"{name}\t{len(wav) / model.tts_model.sample_rate:.3f}s\t{text}", flush=True)


if __name__ == "__main__":
    main()
