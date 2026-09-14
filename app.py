"""
Hugging Face Spaces Entrypoint for GTC 360° AI Engine
Mounts the FastAPI core application to serve all REST API routes and interactive documentation.
"""
import os
import uvicorn
from main import app as fastapi_app

# ZeroGPU compatibility setup:
try:
    import spaces

    HAS_SPACES = True
except Exception:
    HAS_SPACES = False


def gpu_decorator(fn):
    if HAS_SPACES:
        return spaces.GPU(fn)
    return fn


@gpu_decorator
def ai_probe(prompt: str = "health research"):
    """Interactive probe satisfying ZeroGPU startup validation."""
    return f"GTC360 AI Engine is active. Received: {prompt}"


try:
    import gradio as gr

    with gr.Blocks(title="GTC 360° AI — Intelligent Grant Matching Engine") as demo:
        gr.Markdown("""
        # 🏛️ GTC 360° AI — Intelligent Grant Matching Engine
        
        This Space powers the live **AI semantic vector matching microservice** and **grant intelligence API** for GTC 360°.
        
        ### 🔗 Interactive Documentation
        * 📖 **Swagger API Docs:** [/docs](/docs)
        * 📑 **Redoc Documentation:** [/redoc](/redoc)
        * ⚡ **Health Check:** [/health](/health)
        
        ### ⚙️ Core Microservice Endpoints
        * `GET /grants/matches` — Personalized semantic AI grant scoring & ranking
        * `GET /grants/catalog` — Federal & California State grant discovery
        * `POST /auth/login` & `POST /auth/signup` — Secure organization authentication
        * `GET /user/preferences` & `POST /user/preferences` — Target categories & agency affinities
        """)

        with gr.Accordion("🔍 AI Engine ZeroGPU Probe", open=False):
            probe_in = gr.Textbox(label="Query Input", value="Community healthcare development")
            probe_out = gr.Textbox(label="Status")
            probe_btn = gr.Button("Test Engine")
            probe_btn.click(fn=ai_probe, inputs=probe_in, outputs=probe_out)

    # Hugging Face Spaces automatically imports and serves `app` on port 7860
    app = gr.mount_gradio_app(fastapi_app, demo, path="/gradio")
except Exception as e:
    # If gradio mounting fails or is unavailable, serve FastAPI directly
    app = fastapi_app

# Only run standalone uvicorn if running locally outside Hugging Face Spaces
if __name__ == "__main__" and not os.getenv("SPACE_ID"):
    import uvicorn
    port = int(os.getenv("PORT", 7860))
    uvicorn.run(app, host="0.0.0.0", port=port)
