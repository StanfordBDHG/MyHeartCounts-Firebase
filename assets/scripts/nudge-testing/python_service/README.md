# MLX Python Service

This service provides an HTTP API for running MLX models locally using the `mlx-lm` library.

## Setup

1. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```

2. Ensure you have Apple Silicon (M1/M2/M3) Mac - MLX models require Apple Silicon

3. Models will be automatically downloaded from Hugging Face on first use

## Running the Service

Start the service:
```bash
python mlx_service.py
```

Or using uvicorn directly:
```bash
uvicorn mlx_service:app --reload
```

The service will run on `http://localhost:8000` by default.

## API Endpoints

### Health Check
```
GET /health
```

Returns service status.

### Generate Text
```
POST /generate
Content-Type: application/json

{
  "model_id": "mlx-community/Llama-3.2-1B-Instruct-4bit",
  "prompt": "Your prompt here",
  "max_tokens": 512,
  "temperature": 0.7
}
```

**Response:**
```json
{
  "response": "Generated text...",
  "model_id": "mlx-community/Llama-3.2-1B-Instruct-4bit",
  "latency_ms": 1234.56,
  "error": null
}
```

## Supported Models

All models from the `mlx-community` organization on Hugging Face are supported. Models are loaded on-demand (not cached) for simplicity.

Special handling is implemented for:
- `mlx-community/SmolLM3-3B-4bit` - requires system message with "/no_think" content

## Notes

- Models are loaded on-demand for each request (not cached in memory)
- First request for each model may be slower as the model needs to be downloaded/loaded
- The service uses chat templates automatically for proper prompt formatting

