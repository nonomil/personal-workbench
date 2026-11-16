"""One-shot diagnostic for short VoxCPM2 inputs; not part of runtime."""

from pathlib import Path

from voxcpm import VoxCPM


MODEL = "D:/HuggingFaceCache/VoxCPM2"


def main() -> None:
    model = VoxCPM.from_pretrained(MODEL, load_denoiser=False, local_files_only=True)
    cases = [
        ("word-only", "do", {}),
        (
            "long-voice-prompt",
            "(A warm, clear female preschool teacher voice, gentle and slightly slow, with careful English pronunciation.)do",
            {},
        ),
        ("short-voice-prompt", "(warm clear teacher voice)do", {}),
        ("long-prompt-max-32", "(A warm, clear female preschool teacher voice, gentle and slightly slow, with careful English pronunciation.)do", {"max_len": 32}),
        ("word-only-max-24", "do", {"max_len": 24}),
    ]
    for name, text, kwargs in cases:
        wav = model.generate(text=text, cfg_value=2.0, inference_timesteps=10, **kwargs)
        seconds = len(wav) / model.tts_model.sample_rate
        print(f"{name}\t{len(wav)} samples\t{seconds:.3f}s\ttext={text}", flush=True)


if __name__ == "__main__":
    main()
