"""
Model Lab & Pipeline Governance API Routes
"""

from fastapi import APIRouter, HTTPException
from src.config import settings
from src.spark.inference import get_model_metadata
from src.spark.training import train_and_evaluate_model
from src.data.ingestion import load_ag_news_benchmark
from src.api.schemas import ModelLabResponse, PipelineStageSpec, RetrainRequest

router = APIRouter(prefix="/model", tags=["Model Lab"])

PIPELINE_STAGES = [
    PipelineStageSpec(
        stage="1. RegexTokenizer",
        type="Transformer",
        parameters=r"pattern = \W+, minTokenLength = 3, toLowercase = True"
    ),
    PipelineStageSpec(
        stage="2. StopWordsRemover",
        type="Transformer",
        parameters="English standard journalistic stopword lexicon"
    ),
    PipelineStageSpec(
        stage="3. HashingTF",
        type="Transformer",
        parameters="numFeatures = 4,000 (MurmurHash3 term frequency projection)"
    ),
    PipelineStageSpec(
        stage="4. IDF",
        type="Estimator",
        parameters="Inverse Document Frequency weighting (minDocFreq = 1)"
    ),
    PipelineStageSpec(
        stage="5. LogisticRegression",
        type="Estimator",
        parameters="Multinomial Logit, L2 regularization (regParam = 0.08, maxIter = 30)"
    )
]

MODEL_LIMITATIONS = [
    "Optimized for standard English journalistic dispatches and press releases.",
    "Out-of-scope for colloquial social media slang, poetry, or obfuscated text.",
    "Classifies into four canonical desks: World, Sports, Business, Sci/Tech.",
    "Requires human editorial verification if confidence falls below 45% or margin is < 12%."
]


@router.get("", response_model=ModelLabResponse)
def get_model_lab_details():
    """Returns Spark MLlib pipeline stages, hyperparameters, and benchmark evaluation."""
    meta = get_model_metadata()
    if not meta:
        return ModelLabResponse(
            model_version=settings.active_model_version,
            algorithm="Multinomial Logistic Regression (L2 Regularized)",
            feature_extractor="RegexTokenizer -> StopWordsRemover -> HashingTF(4000) -> IDF",
            pipeline_stages=PIPELINE_STAGES,
            limitations=MODEL_LIMITATIONS
        )

    return ModelLabResponse(
        model_version=meta.get("model_version", settings.active_model_version),
        algorithm=meta.get("algorithm", "Multinomial Logistic Regression"),
        feature_extractor=meta.get("feature_extractor", "RegexTokenizer -> StopWordsRemover -> HashingTF -> IDF"),
        training_timestamp=meta.get("training_timestamp"),
        train_record_count=meta.get("train_record_count"),
        test_record_count=meta.get("test_record_count"),
        hyperparameters=meta.get("hyperparameters"),
        metrics=meta.get("metrics"),
        pipeline_stages=PIPELINE_STAGES,
        limitations=MODEL_LIMITATIONS
    )


@router.post("/retrain", response_model=ModelLabResponse)
def retrain_model(req: RetrainRequest):
    """Executes a controlled Spark MLlib retraining run across the AG News benchmark."""
    try:
        train_df, test_df = load_ag_news_benchmark()
        _, new_meta = train_and_evaluate_model(
            train_df=train_df,
            test_df=test_df,
            model_version="v1.0.0-spark-lr",
            num_features=req.num_features,
            reg_param=req.reg_param,
            max_iter=req.max_iter
        )
        return get_model_lab_details()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Model retraining failed: {str(e)}")
