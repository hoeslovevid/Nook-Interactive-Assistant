# Nook Local attribution

Nook Local combines Nook's companion instructions with third-party open-weight
language models. Nook did not train these base models. Saved memory provides
explicit prompt context; it does not train the model.

Runtime: llama.cpp by the ggml-org contributors, MIT license, pinned release
b11669. Source: https://github.com/ggml-org/llama.cpp/tree/b11669
The MIT license is included in local-ai-runtime-LICENSE.txt and copied into the
installed runtime. The downloaded runtime also contains its OpenMP license.

Lite: Qwen3.5-0.8B, Q4_0 GGUF, Apache License 2.0.
Source: https://huggingface.co/ggml-org/Qwen3.5-0.8B-GGUF
Original model: https://huggingface.co/Qwen/Qwen3.5-0.8B

Balanced: Qwen2.5-1.5B-Instruct, Q4_K_M GGUF, Apache License 2.0.
Source: https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct-GGUF
Original model: https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct
The Apache license is included in local-ai-model-LICENSE.txt.

Exact immutable download URLs, revisions, byte lengths and SHA-256 digests are
recorded in local-ai-assets.json. Downloads are optional and are not bundled into
the installer. Nook verifies the downloaded archives and models before use.
