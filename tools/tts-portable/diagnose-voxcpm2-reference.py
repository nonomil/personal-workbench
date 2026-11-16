"""Test VoxCPM2 reference-audio cloning for stable isolated vocabulary words."""

from pathlib import Path

import soundfile as sf
from voxcpm import VoxCPM


MODEL = "D:/HuggingFaceCache/VoxCPM2"
OUT = Path("output/research/20260823-preschool-voxcpm-001/reference-check")


def main() -> None:
    model = VoxCPM.from_pretrained(MODEL, load_denoiser=False, local_files_only=True)
    OUT.mkdir(parents=True, exist_ok=True)
    reference = model.generate(
        text="(warm clear female teacher voice)Hello, I am your friendly English teacher. Let us learn a new word together.",
        cfg_value=2.0,
        inference_timesteps=10,
        max_len=96,
        retry_badcase_ratio_threshold=4.0,
    )
    reference_path = OUT / "teacher-reference.wav"
    sf.write(reference_path, reference, model.tts_model.sample_rate)
    print(f"reference\t{len(reference) / model.tts_model.sample_rate:.3f}s\t{reference_path}", flush=True)

    for word in ("are", "come", "do", "brown"):
        wav = model.generate(
            text=word,
            reference_wav_path=str(reference_path),
            cfg_value=2.0,
            inference_timesteps=10,
            max_len=40,
            retry_badcase_ratio_threshold=4.0,
        )
        path = OUT / f"{word}.wav"
        sf.write(path, wav, model.tts_model.sample_rate)
        print(f"{word}\t{len(wav) / model.tts_model.sample_rate:.3f}s\t{path}", flush=True)


if __name__ == "__main__":
    main()
