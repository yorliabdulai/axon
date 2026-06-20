"""HTTP client for the Axon agent API."""

from __future__ import annotations

from typing import Any

import httpx


class AxonAgent:
    """Python wrapper around the Axon REST API."""

    def __init__(
        self,
        api_url: str = "http://localhost:3000",
        agent_id: str = "default",
        api_key: str | None = None,
        timeout: float = 30.0,
    ) -> None:
        self.api_url = api_url.rstrip("/")
        self.agent_id = agent_id
        self.api_key = api_key
        self.timeout = timeout

    def _headers(self) -> dict[str, str]:
        headers = {"Content-Type": "application/json"}
        if self.api_key:
            headers["x-api-key"] = self.api_key
        return headers

    def chat(
        self,
        message: str,
        session_id: str | None = None,
        language: str = "en",
        channel: str = "web",
        unhelpful_rating: bool = False,
    ) -> dict[str, Any]:
        """Send a chat message and get a response."""
        payload = {
            "message": message,
            "sessionId": session_id,
            "language": language,
            "channel": channel,
            "unhelpfulRating": unhelpful_rating,
        }
        with httpx.Client(timeout=self.timeout) as client:
            response = client.post(
                f"{self.api_url}/agents/{self.agent_id}/chat",
                json=payload,
                headers=self._headers(),
            )
            response.raise_for_status()
            return response.json()

    def add_document(self, source: str) -> dict[str, Any]:
        """Add a document to the knowledge base."""
        with httpx.Client(timeout=self.timeout) as client:
            response = client.post(
                f"{self.api_url}/agents/{self.agent_id}/documents",
                json={"source": source},
                headers=self._headers(),
            )
            response.raise_for_status()
            return response.json()

    def list_documents(self) -> list[dict[str, Any]]:
        """List all documents in the knowledge base."""
        with httpx.Client(timeout=self.timeout) as client:
            response = client.get(
                f"{self.api_url}/agents/{self.agent_id}/documents",
                headers=self._headers(),
            )
            response.raise_for_status()
            return response.json()

    def get_analytics(self) -> dict[str, Any]:
        """Get agent analytics."""
        with httpx.Client(timeout=self.timeout) as client:
            response = client.get(
                f"{self.api_url}/agents/{self.agent_id}/analytics",
                headers=self._headers(),
            )
            response.raise_for_status()
            return response.json()

    def get_config(self) -> dict[str, Any]:
        """Get agent configuration."""
        with httpx.Client(timeout=self.timeout) as client:
            response = client.get(
                f"{self.api_url}/agents/{self.agent_id}/config",
                headers=self._headers(),
            )
            response.raise_for_status()
            return response.json()
