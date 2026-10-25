"""
Single Article Classification Route
"""

from typing import Dict, Any, List
from fastapi import APIRouter, HTTPException
from src.api.schemas import ClassifyRequest, ClassifyResponse
from src.spark.inference import predict_single_article

router = APIRouter(prefix="/classify", tags=["Classify"])

PRESET_SAMPLES = [
    {
        "label": "World (Diplomacy)",
        "desk": "World",
        "title": "UN General Assembly Adopts Historic Non-Proliferation Treaty in Geneva",
        "body": "Delegations from 120 member states ratified the strategic nuclear oversight agreement, establishing international verification protocols and bilateral disarmament checkpoints."
    },
    {
        "label": "Sports (Championship)",
        "desk": "Sports",
        "title": "Stoppage-Time Header Clinches Champions League Victory in Thrilling Final",
        "body": "In front of 75,000 electric supporters, the star striker rose above two defenders in the 94th minute to power home the decisive goal, sealing a dramatic 2-1 title comeback."
    },
    {
        "label": "Business (Monetary Policy)",
        "desk": "Business",
        "title": "Central Bank Holds Benchmark Interest Rates Steady Amid Cooling Inflation Data",
        "body": "Federal policymakers cited stabilizing wholesale producer prices and sustainable corporate earnings, signaling potential rate reductions during the fourth quarter fiscal deliberations."
    },
    {
        "label": "Sci/Tech (Quantum Computing)",
        "desk": "Sci/Tech",
        "title": "Research Consortium Demonstrates Fault-Tolerant Quantum Logic Gates",
        "body": "Physicists integrated 100 superconducting qubits with real-time syndrome extraction, suppressing hardware gate error rates below the fault-tolerant threshold."
    }
]


@router.get("/presets", response_model=List[Dict[str, str]])
def get_presets():
    """Returns curated journalistic wire presets across all four categories."""
    return PRESET_SAMPLES


@router.post("", response_model=ClassifyResponse)
def classify_article(req: ClassifyRequest):
    """Executes distributed inference on a single news wire dispatch using Spark MLlib."""
    title = (req.title or "").strip()
    body = (req.body or "").strip()

    if not title and not body:
        raise HTTPException(status_code=400, detail="Headline or article text is required.")

    try:
        res = predict_single_article(title=title, body=body)
        if "error" in res:
            raise HTTPException(status_code=400, detail=res["error"])
        return ClassifyResponse(**res)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Inference execution failed: {str(e)}")
