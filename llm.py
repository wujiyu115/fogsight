import asyncio
import json
from typing import AsyncGenerator, List, Optional

from config import PROVIDER, MODEL, anthropic_client, client, gemini_client


async def llm_event_stream(
    topic: str,
    history: Optional[List[dict]] = None,
    model: str = None,
    system_prompt: Optional[str] = None,
    temperature: float = 0.8,
) -> AsyncGenerator[str, None]:
    history = history or []
    if model is None:
        model = MODEL

    if system_prompt is None:
        from prompts.html_prompt import get_html_prompt
        system_prompt = get_html_prompt(topic)

    if PROVIDER == "gemini":
        try:
            full_prompt = system_prompt + "\n\n" + topic
            if history:
                history_text = "\n".join([f"{msg['role']}: {msg['content']}" for msg in history])
                full_prompt = history_text + "\n\n" + full_prompt

            response = await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: gemini_client.models.generate_content(
                    model=model,
                    contents=full_prompt
                )
            )

            text = response.text
            chunk_size = 50
            for i in range(0, len(text), chunk_size):
                chunk = text[i:i+chunk_size]
                payload = json.dumps({"token": chunk}, ensure_ascii=False)
                yield f"data: {payload}\n\n"
                await asyncio.sleep(0.05)

        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
            return

    elif PROVIDER == "anthropic":
        import anthropic as anthropic_mod
        messages = []
        for msg in history:
            messages.append({"role": msg["role"], "content": msg["content"]})
        messages.append({"role": "user", "content": topic})

        try:
            async with anthropic_client.messages.stream(
                model=model,
                max_tokens=16000,
                system=system_prompt,
                messages=messages,
                temperature=temperature,
            ) as stream:
                async for text in stream.text_stream:
                    if text:
                        payload = json.dumps({"token": text}, ensure_ascii=False)
                        yield f"data: {payload}\n\n"
        except anthropic_mod.APIError as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
            return

    else:
        from openai import OpenAIError
        messages = [
            {"role": "system", "content": system_prompt},
            *history,
            {"role": "user", "content": topic},
        ]

        try:
            response = await client.chat.completions.create(
                model=model,
                messages=messages,
                stream=True,
                temperature=temperature,
            )
        except OpenAIError as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
            return

        async for chunk in response:
            choices = getattr(chunk, "choices", None)
            if not choices:
                continue
            delta = getattr(choices[0], "delta", None)
            if not delta:
                continue
            token = getattr(delta, "content", None) or ""
            if not token:
                continue
            payload = json.dumps({"token": token}, ensure_ascii=False)
            yield f"data: {payload}\n\n"
            await asyncio.sleep(0.001)

    yield 'data: {"event":"[DONE]"}\n\n'
