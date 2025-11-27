import os
import aiohttp
from tenacity import retry, stop_after_attempt, wait_exponential
import base64
from typing import Dict, Any

class RoboflowService:
    def __init__(self):
        self.api_key = os.getenv("ROBOFLOW_API_KEY")
        self.project = os.getenv("ROBOFLOW_PROJECT")
        self.version = os.getenv("ROBOFLOW_VERSION")
        self.base_url = "https://detect.roboflow.com"

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=4, max=10))
    async def infer(self, image_bytes: bytes) -> Dict[str, Any]:
        if not self.api_key or not self.project or not self.version:
            # Mock response if no keys (for testing without real API)
            print("Warning: Roboflow keys missing, returning mock data")
            return {"predictions": []}

        # Encode image to base64
        img_str = base64.b64encode(image_bytes).decode("utf-8")
        
        url = f"{self.base_url}/{self.project}/{self.version}?api_key={self.api_key}"
        
        async with aiohttp.ClientSession() as session:
            async with session.post(url, data=img_str, headers={"Content-Type": "application/x-www-form-urlencoded"}) as response:
                response.raise_for_status()
                return await response.json()
