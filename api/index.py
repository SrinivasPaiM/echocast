import asyncio
import edge_tts
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
import io
import os

app = FastAPI()

# Enable CORS for local development and potential Vercel deployment
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/voices")
async def get_voices():
    try:
        voices = await edge_tts.list_voices()
        return voices
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/sample/{voice_id}")
async def get_sample(voice_id: str):
    try:
        # Find the voice to get its friendly name if possible
        voices = await edge_tts.list_voices()
        voice_info = next((v for v in voices if v["ShortName"] == voice_id), None)
        friendly_name = voice_info["FriendlyName"] if voice_info else voice_id
        
        text = f"Hello, I am {friendly_name}. This is a sample of my voice. I hope you find it suitable for your project."
        communicate = edge_tts.Communicate(text, voice_id)
        
        audio_data = b""
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                audio_data += chunk["data"]
        
        return StreamingResponse(io.BytesIO(audio_data), media_type="audio/mpeg")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/tts")
async def generate_tts(data: dict):
    text = data.get("text")
    voice = data.get("voice")
    
    if not text or not voice:
        raise HTTPException(status_code=400, detail="Text and voice must be provided")
    
    try:
        communicate = edge_tts.Communicate(text, voice)
        audio_data = b""
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                audio_data += chunk["data"]
                
        return StreamingResponse(io.BytesIO(audio_data), media_type="audio/mpeg")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
