# Optional local speech packages

Nook downloads these packages only when chosen in Voice. They are not included in the installer. Package URLs, exact lengths and SHA-256 hashes are pinned in `native-speech-assets.json`; failed integrity checks do not install the package. The x64 Windows runtime executes as a separate local process, with four CPU threads and bounded processing time. Remove a selected model package in Voice; the shared runtime remains for the other packages.

- [sherpa-onnx](https://github.com/k2-fsa/sherpa-onnx), runtime v1.13.8, Apache-2.0. The downloaded archive retains its notices and runtime components.
- [NVIDIA Parakeet TDT 0.6B v3](https://huggingface.co/nvidia/parakeet-tdt-0.6b-v3), CC BY 4.0, converted and quantized to int8 ONNX by the sherpa-onnx project. Attribution: NVIDIA and the sherpa-onnx contributors. Original model: NVIDIA Parakeet TDT 0.6B v3. Conversion changes storage and inference representation. [License](https://creativecommons.org/licenses/by/4.0/).
- [pyannote segmentation 3.0](https://huggingface.co/pyannote/segmentation-3.0), MIT, ONNX conversion distributed by sherpa-onnx.
- [3D-Speaker ERes2Net embedding](https://github.com/modelscope/3D-Speaker), Apache-2.0, distributed as `3dspeaker_speech_eres2net_base_sv_zh-cn_3dspeaker_16k.onnx` by sherpa-onnx.

Speaker separation estimates turns; it does not identify a person. The user supplies display names. Speaker-aware meetings retain at most 40 MB of mono 16 kHz PCM audio in memory for the final local pass. Temporary WAV files are deleted after processing, and orphaned speech WAVs are removed on next startup. Cancelling or locking the PC discards retained meeting audio. Saving a transcript is a separate explicit action.

Parakeet is multilingual, but it does not cover every language. Consult the original model card for supported languages. Benchmark uses the public English sample included in the model package; it measures processing speed, not accuracy on the user's voice. Nook keeps Windows speech as the default and also retains the existing optional Whisper engine.
