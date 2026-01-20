"""
This source file is part of the Stanford Biodesign Digital Health MyHeart Counts open-source project

SPDX-FileCopyrightText: 2025 Stanford University

SPDX-License-Identifier: MIT
"""

from typing import Optional
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from mlx_lm import load, generate

app = FastAPI()

# Request/Response models
class GenerateRequest(BaseModel):
    model_id: str
    prompt: str
    max_tokens: int = 512
    temperature: Optional[float] = None

class GenerateResponse(BaseModel):
    response: str
    model_id: str
    error: Optional[str] = None

class HealthResponse(BaseModel):
    status: str
    message: str

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    return HealthResponse(status="healthy", message="MLX service is running")

@app.post("/generate", response_model=GenerateResponse)
async def generate_text(request: GenerateRequest):
    """
    Generate text using MLX models.
    Loads model on-demand and generates response.
    """
    try:
        model_name = request.model_id
        model, tokenizer = load(model_name)
        
        # Format prompt with chat template
        context = [{"role": "user", "content": request.prompt}]
        
        if model_name == "mlx-community/SmolLM3-3B-4bit":
            context.insert(0, {"role": "system", "content": "/no_think"})
        
        formatted_prompt = tokenizer.apply_chat_template(
            context, add_generation_prompt=True
        )
        
        # Note: mlx_lm.generate() does NOT accept temperature/temp parameters
        # See: https://github.com/ml-explore/mlx-lm/issues/281
        generate_kwargs = {
            "prompt": formatted_prompt,
            "max_tokens": request.max_tokens
        }
        
        # Generate text
        text = generate(model, tokenizer, **generate_kwargs)
        
        return GenerateResponse(
            response=text,
            model_id=model_name
        )
        
    except Exception as e:
        error_message = str(e)
        
        return GenerateResponse(
            response="",
            model_id=request.model_id,
            error=error_message
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

