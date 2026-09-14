"""
Hugging Face Spaces Entrypoint for GTC 360° AI Engine
Mounts the FastAPI core application to serve all REST API routes and interactive documentation.
"""
import os
import uvicorn
from main import app as fastapi_app

try:
    import gradio as gr

    with gr.Blocks(title="GTC 360° AI — Intelligent Grant Matching Engine") as demo:
        gr.Markdown("""
        # 🏛️ GTC 360° AI — Intelligent Grant Matching Engine
        
        This Space powers the live **AI semantic vector matching microservice** and **grant intelligence API** for GTC 360°.
        
        ### 🔗 Interactive Documentation
        * 📖 **Swagger API Docs:** [/docs](/docs)
        * 📑 **Redoc Documentation:** [/redoc](/redoc)
        * ⚡ **Health & Readiness Check:** [/ready](/ready)
        
        ### ⚙️ Core Microservice Endpoints
        * `GET /grants/matches` — Personalized semantic AI grant scoring & ranking
        * `GET /grants/catalog` — Federal & California State grant discovery
        * `POST /auth/login` & `POST /auth/signup` — Secure organization authentication
        * `GET /user/preferences` & `POST /user/preferences` — Target categories & agency affinities
        """)

    app = gr.mount_gradio_app(fastapi_app, demo, path="/")
except Exception as e:
    # If gradio mounting fails or is unavailable, serve FastAPI directly
    app = fastapi_app

if __name__ == "__main__":
    port = int(os.getenv("PORT", 7860))
    uvicorn.run(app, host="0.0.0.0", port=port)
