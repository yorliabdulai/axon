# axon-ai

Python SDK for the Axon multilingual customer support agent.

## Install

```bash
pip install -e python/axon-ai
```

## Usage

```python
from axon_ai import AxonAgent

agent = AxonAgent(
    api_url="http://localhost:3000",
    agent_id="default",
)

response = agent.chat(
    message="What are your opening hours?",
    session_id="demo-session",
    language="en",
)
print(response["content"])
```

## Configuration

The Python SDK wraps the Axon REST API. Start the API server first:

```bash
pnpm --filter @axon-ai/core dev
```
